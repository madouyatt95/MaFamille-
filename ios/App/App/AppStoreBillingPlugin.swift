import Capacitor
import Foundation
import StoreKit

@objc(AppStoreBillingPlugin)
public class AppStoreBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppStoreBillingPlugin"
    public let jsName = "AppStoreBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []
        guard !productIds.isEmpty else {
            call.reject("Aucun produit App Store n'est configuré.")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIds)
                #if DEBUG
                if products.isEmpty {
                    call.resolve([
                        "products": productIds.compactMap { debugProduct(for: $0) }
                    ])
                    return
                }
                #endif
                call.resolve([
                    "products": products.map { serializeProduct($0) }
                ])
            } catch {
                call.reject("Impossible de charger les produits App Store.", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Le produit App Store est manquant.")
            return
        }
        guard let accountTokenValue = call.getString("appAccountToken"),
              let accountToken = UUID(uuidString: accountTokenValue) else {
            call.reject("L'identifiant du foyer est invalide.")
            return
        }

        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    #if DEBUG
                    guard debugProduct(for: productId) != nil else {
                        call.reject("Produit App Store introuvable.")
                        return
                    }
                    call.resolve(debugTransaction(productId: productId, appAccountToken: accountToken))
                    return
                    #else
                    call.reject("Produit App Store introuvable.")
                    return
                    #endif
                }

                let result = try await product.purchase(options: [
                    .appAccountToken(accountToken)
                ])
                switch result {
                case .success(let verification):
                    let transaction = try verifiedTransaction(from: verification)
                    await transaction.finish()
                    call.resolve(serializeTransaction(transaction, signedTransactionInfo: verification.jwsRepresentation))
                case .userCancelled:
                    call.reject("Achat annulé.")
                case .pending:
                    call.resolve([
                        "status": "pending",
                        "message": "L'achat est en attente de validation par Apple."
                    ])
                @unknown default:
                    call.reject("Réponse App Store inconnue.")
                }
            } catch {
                call.reject("Impossible de finaliser l'achat App Store.", nil, error)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []

        Task {
            do {
                try await AppStore.sync()
                for await entitlement in Transaction.currentEntitlements {
                    if case .verified(let transaction) = entitlement,
                       productIds.isEmpty || productIds.contains(transaction.productID) {
                        call.resolve(serializeTransaction(transaction, signedTransactionInfo: entitlement.jwsRepresentation))
                        return
                    }
                }
                #if DEBUG
                if let productId = UserDefaults.standard.string(forKey: "myfamilyplus.debugStoreKitProductId"),
                   productIds.isEmpty || productIds.contains(productId) {
                    call.resolve(debugTransaction(productId: productId, appAccountToken: UUID()))
                    return
                }
                #endif
                call.reject("Aucun achat Premium actif n'a été trouvé sur cet identifiant Apple.")
            } catch {
                call.reject("Impossible de restaurer les achats App Store.", nil, error)
            }
        }
    }

    private func verifiedTransaction(from verification: VerificationResult<Transaction>) throws -> Transaction {
        switch verification {
        case .verified(let transaction):
            return transaction
        case .unverified(_, let error):
            throw error
        }
    }

    private func serializeProduct(_ product: Product) -> [String: Any] {
        var payload: [String: Any] = [
            "id": product.id,
            "title": product.displayName,
            "description": product.description,
            "price": product.displayPrice,
            "priceAmount": NSDecimalNumber(decimal: product.price).doubleValue
        ]

        payload["currencyCode"] = product.priceFormatStyle.currencyCode

        return payload
    }

    #if DEBUG
    private func debugProduct(for productId: String) -> [String: Any]? {
        switch productId {
        case "myfamilyplus.premium.monthly":
            return [
                "id": productId,
                "title": "MyFamily+ Premium Mensuel",
                "description": "Essai gratuit de 7 jours, puis abonnement mensuel.",
                "price": "5,99 €",
                "priceAmount": 5.99,
                "currencyCode": "EUR"
            ]
        case "myfamilyplus.premium.yearly":
            return [
                "id": productId,
                "title": "MyFamily+ Premium Annuel",
                "description": "Essai gratuit de 7 jours, puis abonnement annuel.",
                "price": "39,99 €",
                "priceAmount": 39.99,
                "currencyCode": "EUR"
            ]
        default:
            return nil
        }
    }

    private func debugTransaction(productId: String, appAccountToken: UUID) -> [String: Any] {
        let transactionId = UInt64(Date().timeIntervalSince1970 * 1000)
        let expirationDate = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
        UserDefaults.standard.set(productId, forKey: "myfamilyplus.debugStoreKitProductId")

        return [
            "status": "verified",
            "productId": productId,
            "transactionId": String(transactionId),
            "originalTransactionId": String(transactionId),
            "signedTransactionInfo": "",
            "expiresAt": ISO8601DateFormatter().string(from: expirationDate),
            "expiresAtMs": Int(expirationDate.timeIntervalSince1970 * 1000),
            "appAccountToken": appAccountToken.uuidString.lowercased(),
            "localStoreKitTest": true
        ]
    }
    #endif

    private func serializeTransaction(_ transaction: Transaction, signedTransactionInfo: String) -> [String: Any] {
        var payload: [String: Any] = [
            "status": "verified",
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "signedTransactionInfo": signedTransactionInfo
        ]

        if let expirationDate = transaction.expirationDate {
            payload["expiresAt"] = ISO8601DateFormatter().string(from: expirationDate)
            payload["expiresAtMs"] = Int(expirationDate.timeIntervalSince1970 * 1000)
        }
        if let appAccountToken = transaction.appAccountToken {
            payload["appAccountToken"] = appAccountToken.uuidString.lowercased()
        }

        return payload
    }
}
