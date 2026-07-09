import MobileCoreServices
import UniformTypeIdentifiers
import UIKit

final class ShareViewController: UIViewController {
    private let statusLabel = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        configureView()
        collectSharedContent()
    }

    private func configureView() {
        view.backgroundColor = UIColor(red: 0.04, green: 0.07, blue: 0.13, alpha: 1)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.text = "Ouverture de MyFamily+..."
        statusLabel.textColor = .white
        statusLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        statusLabel.textAlignment = .center
        view.addSubview(statusLabel)
        NSLayoutConstraint.activate([
            statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private func collectSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem], !items.isEmpty else {
            openApp(title: "Contenu partagé", text: "", url: "", kind: "vault")
            return
        }

        var title = items.compactMap { $0.attributedTitle?.string }.first ?? "Contenu partagé"
        var textParts: [String] = []
        var urlValue = ""
        var kind = "vault"
        let group = DispatchGroup()

        for provider in items.flatMap({ $0.attachments ?? [] }) {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                    if let url = item as? URL {
                        urlValue = url.absoluteString
                        title = url.host ?? title
                        kind = self.kindFor(url: url)
                    }
                    group.leave()
                }
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                    if let text = item as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                        textParts.append(text)
                        kind = self.kindFor(text: text)
                    }
                    group.leave()
                }
            } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                title = "Photo partagée"
                textParts.append("Photo reçue depuis le menu Partager iOS. Ouvrez l’action rapide pour la scanner ou l’ajouter au bon module.")
                kind = "memory"
            } else if provider.hasItemConformingToTypeIdentifier(UTType.pdf.identifier) {
                title = "PDF partagé"
                textParts.append("Document PDF reçu depuis le menu Partager iOS.")
                kind = "vault"
            } else if provider.hasItemConformingToTypeIdentifier(UTType.data.identifier) {
                title = "Fichier partagé"
                textParts.append("Fichier reçu depuis le menu Partager iOS.")
                kind = "vault"
            }
        }

        group.notify(queue: .main) {
            self.openApp(title: title, text: textParts.joined(separator: "\n\n"), url: urlValue, kind: kind)
        }
    }

    private func openApp(title: String, text: String, url: String, kind: String) {
        var components = URLComponents()
        components.scheme = "myfamilyplus"
        components.host = "action"
        components.queryItems = [
            URLQueryItem(name: "action", value: "share-intake"),
            URLQueryItem(name: "target", value: kind),
            URLQueryItem(name: "title", value: title),
            URLQueryItem(name: "text", value: text),
            URLQueryItem(name: "url", value: url)
        ]

        guard let deepLink = components.url else {
            extensionContext?.completeRequest(returningItems: nil)
            return
        }

        extensionContext?.open(deepLink) { _ in
            self.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func kindFor(url: URL) -> String {
        let value = url.absoluteString.lowercased()
        if value.contains("maps") || value.contains("booking") || value.contains("airbnb") || value.contains("hotel") || value.contains("train") || value.contains("flight") {
            return "trip"
        }
        if value.contains("calendar") || value.contains("agenda") || value.contains("event") {
            return "agenda"
        }
        return "vault"
    }

    private func kindFor(text: String) -> String {
        let value = text.lowercased()
        if value.range(of: "ticket|reçu|recu|facture|total|montant", options: .regularExpression) != nil { return "budget" }
        if value.range(of: "devoir|exercice|leçon|lecon|classe|prof", options: .regularExpression) != nil { return "homework" }
        if value.range(of: "courses|acheter|panier|supermarché|supermarche", options: .regularExpression) != nil { return "groceries" }
        if value.range(of: "rendez-vous|rdv|événement|evenement|agenda", options: .regularExpression) != nil { return "agenda" }
        return "vault"
    }
}
