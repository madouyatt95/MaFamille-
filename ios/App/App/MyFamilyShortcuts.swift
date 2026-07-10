import AppIntents
import Foundation

enum MyFamilyQuickActionStore {
    static let appGroupIdentifier = "group.fr.myfamilyplus.app"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupIdentifier) ?? .standard
    }

    static func enqueue(action: String, query: String = "") {
        defaults.set(action, forKey: "mf_pending_quick_action_native")
        defaults.set(query, forKey: "mf_pending_quick_action_query_native")
        UserDefaults.standard.set(action, forKey: "mf_pending_quick_action_native")
        UserDefaults.standard.set(query, forKey: "mf_pending_quick_action_query_native")
    }

    static func consume() -> (action: String, query: String)? {
        let action = defaults.string(forKey: "mf_pending_quick_action_native")
            ?? UserDefaults.standard.string(forKey: "mf_pending_quick_action_native")
        guard let action, !action.isEmpty else { return nil }
        let query = defaults.string(forKey: "mf_pending_quick_action_query_native")
            ?? UserDefaults.standard.string(forKey: "mf_pending_quick_action_query_native")
            ?? ""
        [defaults, .standard].forEach { store in
            store.removeObject(forKey: "mf_pending_quick_action_native")
            store.removeObject(forKey: "mf_pending_quick_action_query_native")
            store.removeObject(forKey: "mf_pending_quick_micro_native")
        }
        return (action, query)
    }
}

@available(iOS 16.0, *)
private protocol MyFamilyQuickActionIntent: AppIntent {
    var actionName: String { get }
    var queryItems: [URLQueryItem] { get }
}

@available(iOS 16.0, *)
extension MyFamilyQuickActionIntent {
    static var openAppWhenRun: Bool { true }

    func perform() async throws -> some IntentResult {
        let query = URLComponents(string: "https://myfamilyplus.fr")
        var components = query
        components?.queryItems = [URLQueryItem(name: "action", value: actionName)] + queryItems
        MyFamilyQuickActionStore.enqueue(action: actionName, query: components?.percentEncodedQuery ?? "action=\(actionName)")
        return .result()
    }
}

@available(iOS 16.0, *)
struct OpenFamilyMicroIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "Ouvrir le micro MyFamily+"
    static var description = IntentDescription("Ouvre directement le micro principal de MyFamily+.")
    var actionName: String { "open-micro" }
    var queryItems: [URLQueryItem] { [] }
}

@available(iOS 16.0, *)
struct AddFamilyExpenseIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "J’ai payé"
    static var description = IntentDescription("Prépare une dépense familiale à vérifier avant enregistrement.")

    @Parameter(title: "Montant") var amount: Double?
    @Parameter(title: "Commerce ou description") var merchant: String?
    @Parameter(title: "Devise") var currency: String?
    @Parameter(title: "Date") var transactionDate: Date?

    init() {}
    init(amount: Double? = nil, merchant: String? = nil, currency: String? = nil, transactionDate: Date? = nil) {
        self.amount = amount
        self.merchant = merchant
        self.currency = currency
        self.transactionDate = transactionDate
    }

    var actionName: String { "paid" }
    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        if let amount { items.append(URLQueryItem(name: "amount", value: String(amount))) }
        if let merchant, !merchant.isEmpty { items.append(URLQueryItem(name: "merchant", value: merchant)) }
        if let currency, !currency.isEmpty { items.append(URLQueryItem(name: "currency", value: currency.uppercased())) }
        if let transactionDate { items.append(URLQueryItem(name: "date", value: ISO8601DateFormatter().string(from: transactionDate))) }
        return items
    }
}

@available(iOS 16.0, *)
struct ScanFamilyReceiptIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "Scanner un ticket"
    static var description = IntentDescription("Ouvre le scanner de ticket avec lecture locale sur l’appareil.")
    var actionName: String { "scan-receipt" }
    var queryItems: [URLQueryItem] { [] }
}

@available(iOS 16.0, *)
struct ScanFamilyHomeworkIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "Scanner un devoir"
    static var description = IntentDescription("Ouvre le scanner de devoir avec lecture locale sur l’appareil.")
    var actionName: String { "scan-homework" }
    var queryItems: [URLQueryItem] { [] }
}

@available(iOS 16.0, *)
struct AddFamilyGroceryIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "Ajouter aux courses"
    static var description = IntentDescription("Ouvre les courses avec le micro principal prêt à écouter.")
    var actionName: String { "add-grocery" }
    var queryItems: [URLQueryItem] { [] }
}

@available(iOS 16.0, *)
struct OpenFamilyVaultIntent: MyFamilyQuickActionIntent {
    static var title: LocalizedStringResource = "Ouvrir le coffre-fort"
    static var description = IntentDescription("Ouvre les documents et démarches protégés du foyer.")
    var actionName: String { "open-vault" }
    var queryItems: [URLQueryItem] { [] }
}

@available(iOS 16.0, *)
struct MyFamilyAppShortcuts: AppShortcutsProvider {
    static var shortcutTileColor: ShortcutTileColor = .purple

    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenFamilyMicroIntent(), phrases: [
            "Ouvre le micro avec \(.applicationName)",
            "Parler à ma famille avec \(.applicationName)"
        ], shortTitle: "Micro", systemImageName: "mic.fill")
        AppShortcut(intent: AddFamilyExpenseIntent(), phrases: [
            "J’ai payé avec \(.applicationName)",
            "Ajouter une dépense avec \(.applicationName)"
        ], shortTitle: "J’ai payé", systemImageName: "eurosign.circle.fill")
        AppShortcut(intent: ScanFamilyReceiptIntent(), phrases: [
            "Scanner un ticket avec \(.applicationName)"
        ], shortTitle: "Ticket", systemImageName: "doc.text.viewfinder")
        AppShortcut(intent: ScanFamilyHomeworkIntent(), phrases: [
            "Scanner un devoir avec \(.applicationName)"
        ], shortTitle: "Devoir", systemImageName: "text.viewfinder")
        AppShortcut(intent: AddFamilyGroceryIntent(), phrases: [
            "Ajouter aux courses avec \(.applicationName)"
        ], shortTitle: "Courses", systemImageName: "cart.fill")
        AppShortcut(intent: OpenFamilyVaultIntent(), phrases: [
            "Ouvre le coffre-fort avec \(.applicationName)"
        ], shortTitle: "Coffre-fort", systemImageName: "lock.doc.fill")
    }
}
