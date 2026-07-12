import UniformTypeIdentifiers
import UIKit

private struct SharedPayloadFile: Codable {
    let name: String
    let type: String
    let path: String
}

private struct SharedPayloadManifest: Codable {
    let id: String
    let title: String
    let text: String
    let url: String
    let target: String
    let files: [SharedPayloadFile]
}

final class ShareViewController: UIViewController {
    private let appGroupIdentifier = "group.fr.myfamilyplus.app"
    private let pendingShareIdKey = "mf_pending_share_id"
    private let statusLabel = UILabel()
    private let openButton = UIButton(type: .system)
    private let stateQueue = DispatchQueue(label: "fr.myfamilyplus.share-state")
    private var pendingDeepLink: URL?

    override func viewDidLoad() {
        super.viewDidLoad()
        configureView()
        collectSharedContent()
    }

    private func configureView() {
        view.backgroundColor = UIColor(red: 0.04, green: 0.07, blue: 0.13, alpha: 1)
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        statusLabel.text = "Préparation du partage…"
        statusLabel.textColor = .white
        statusLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 0
        view.addSubview(statusLabel)

        openButton.translatesAutoresizingMaskIntoConstraints = false
        openButton.setTitle("Ouvrir MyFamily+", for: .normal)
        openButton.setTitleColor(.white, for: .normal)
        openButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        openButton.backgroundColor = UIColor(red: 0.42, green: 0.36, blue: 1, alpha: 1)
        openButton.layer.cornerRadius = 14
        openButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 22, bottom: 14, right: 22)
        openButton.isHidden = true
        openButton.addTarget(self, action: #selector(retryOpenApp), for: .touchUpInside)
        view.addSubview(openButton)

        NSLayoutConstraint.activate([
            statusLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            statusLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            statusLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -34),
            openButton.topAnchor.constraint(equalTo: statusLabel.bottomAnchor, constant: 24),
            openButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            openButton.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            openButton.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24)
        ])
    }

    private func collectSharedContent() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem], !items.isEmpty else {
            openApp(SharedPayloadManifest(id: UUID().uuidString, title: "Contenu partagé", text: "", url: "", target: "vault", files: []), persisted: false)
            return
        }
        let shareId = UUID().uuidString
        var title = items.compactMap { $0.attributedTitle?.string }.first ?? "Contenu partagé"
        var textParts: [String] = []
        var urlValue = ""
        var target = "vault"
        var files: [SharedPayloadFile] = []
        let group = DispatchGroup()

        for provider in items.flatMap({ $0.attachments ?? [] }) {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, _ in
                    self.stateQueue.sync {
                        if let url = item as? URL {
                            urlValue = url.absoluteString
                            title = url.host ?? title
                            target = self.kindFor(url: url)
                        }
                    }
                    group.leave()
                }
                continue
            }
            if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, _ in
                    self.stateQueue.sync {
                        if let text = item as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            textParts.append(text)
                            target = self.kindFor(text: text)
                        }
                    }
                    group.leave()
                }
                continue
            }
            if let typeIdentifier = fileTypeIdentifier(for: provider) {
                group.enter()
                persistFile(from: provider, typeIdentifier: typeIdentifier, shareId: shareId) { file in
                    self.stateQueue.sync {
                        guard let file else { return }
                        files.append(file)
                        if UTType(typeIdentifier)?.conforms(to: .image) == true {
                            title = files.count > 1 ? "Photos partagées" : "Photo partagée"
                            target = "memory"
                        } else if UTType(typeIdentifier)?.conforms(to: .pdf) == true {
                            title = "PDF partagé"
                            target = "vault"
                        } else {
                            title = "Fichier partagé"
                            target = "vault"
                        }
                    }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) {
            self.stateQueue.sync {
                let manifest = SharedPayloadManifest(id: shareId, title: title, text: textParts.joined(separator: "\n\n"), url: urlValue, target: target, files: files)
                self.openApp(manifest, persisted: self.writeManifest(manifest))
            }
        }
    }

    private func fileTypeIdentifier(for provider: NSItemProvider) -> String? {
        provider.registeredTypeIdentifiers.first { identifier in
            guard let type = UTType(identifier) else { return false }
            return type.conforms(to: .image) || type.conforms(to: .pdf) || type.conforms(to: .data)
        }
    }

    private func persistFile(from provider: NSItemProvider, typeIdentifier: String, shareId: String, completion: @escaping (SharedPayloadFile?) -> Void) {
        provider.loadFileRepresentation(forTypeIdentifier: typeIdentifier) { url, _ in
            if let url, let item = self.copySharedFile(from: url, typeIdentifier: typeIdentifier, shareId: shareId) {
                completion(item)
                return
            }
            provider.loadDataRepresentation(forTypeIdentifier: typeIdentifier) { data, _ in
                guard let data else { completion(nil); return }
                completion(self.writeSharedData(data, typeIdentifier: typeIdentifier, shareId: shareId))
            }
        }
    }

    private func inboxURL() -> URL? {
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else { return nil }
        let inbox = container.appendingPathComponent("ShareInbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)
        return inbox
    }

    private func copySharedFile(from source: URL, typeIdentifier: String, shareId: String) -> SharedPayloadFile? {
        guard let inbox = inboxURL() else { return nil }
        let fileName = "\(shareId)-\(UUID().uuidString).\(extensionFor(source: source, typeIdentifier: typeIdentifier))"
        let destination = inbox.appendingPathComponent(fileName)
        do {
            try FileManager.default.copyItem(at: source, to: destination)
            return SharedPayloadFile(name: source.lastPathComponent.isEmpty ? "Document" : source.lastPathComponent, type: mimeType(for: typeIdentifier), path: fileName)
        } catch {
            return nil
        }
    }

    private func writeSharedData(_ data: Data, typeIdentifier: String, shareId: String) -> SharedPayloadFile? {
        guard let inbox = inboxURL() else { return nil }
        let fileName = "\(shareId)-\(UUID().uuidString).\(extensionFor(source: nil, typeIdentifier: typeIdentifier))"
        let destination = inbox.appendingPathComponent(fileName)
        do {
            try data.write(to: destination, options: .atomic)
            return SharedPayloadFile(name: "Document partagé", type: mimeType(for: typeIdentifier), path: fileName)
        } catch {
            return nil
        }
    }

    private func writeManifest(_ manifest: SharedPayloadManifest) -> Bool {
        guard let inbox = inboxURL(), let data = try? JSONEncoder().encode(manifest) else { return false }
        do {
            try data.write(to: inbox.appendingPathComponent("\(manifest.id).json"), options: .atomic)
            UserDefaults(suiteName: appGroupIdentifier)?.set(manifest.id, forKey: pendingShareIdKey)
            return true
        } catch {
            return false
        }
    }

    private func openApp(_ manifest: SharedPayloadManifest, persisted: Bool) {
        var components = URLComponents()
        components.scheme = "myfamilyplus"
        components.host = "action"
        var queryItems = [
            URLQueryItem(name: "action", value: "share-intake"),
            URLQueryItem(name: "target", value: manifest.target),
            URLQueryItem(name: "shareId", value: persisted ? manifest.id : nil)
        ]
        if !persisted {
            queryItems += [
                URLQueryItem(name: "title", value: clipped(manifest.title, maxLength: 90)),
                URLQueryItem(name: "text", value: clipped(manifest.text, maxLength: 1200)),
                URLQueryItem(name: "url", value: clipped(manifest.url, maxLength: 500))
            ]
        }
        components.queryItems = queryItems
        guard let deepLink = components.url else {
            statusLabel.text = "Le contenu n’a pas pu être préparé."
            return
        }

        pendingDeepLink = deepLink
        openButton.isHidden = false
        statusLabel.text = persisted
            ? "Votre contenu est prêt dans MyFamily+."
            : "MyFamily+ va recevoir ce contenu sans fichier joint."
        attemptOpenApp(deepLink)
    }

    @objc private func retryOpenApp() {
        guard let pendingDeepLink else { return }
        attemptOpenApp(pendingDeepLink)
    }

    private func attemptOpenApp(_ deepLink: URL) {
        statusLabel.text = "Ouverture de MyFamily+…"
        openButton.isEnabled = false
        extensionContext?.open(deepLink) { success in
            DispatchQueue.main.async {
                self.openButton.isEnabled = true
            }
            if success {
                // Do not complete the extension here: doing so can immediately
                // return the user to the source application after MyFamily+ opens.
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                let opened = self.openDeepLinkThroughResponderChain(deepLink)
                self.statusLabel.text = opened
                    ? "MyFamily+ s’ouvre…"
                    : "Touchez « Ouvrir MyFamily+ ». Le contenu restera disponible si vous ouvrez l’application manuellement."
                self.openButton.isHidden = opened
            }
        }
    }

    private func clipped(_ value: String, maxLength: Int) -> String {
        guard value.count > maxLength else { return value }
        return String(value.prefix(maxLength))
    }

    private func extensionFor(source: URL?, typeIdentifier: String) -> String {
        if let extensionName = source?.pathExtension, !extensionName.isEmpty { return extensionName }
        if let type = UTType(typeIdentifier), let extensionName = type.preferredFilenameExtension { return extensionName }
        return "bin"
    }

    private func mimeType(for typeIdentifier: String) -> String {
        UTType(typeIdentifier)?.preferredMIMEType ?? "application/octet-stream"
    }

    private func openDeepLinkThroughResponderChain(_ url: URL) -> Bool {
        let selector = NSSelectorFromString("openURL:")
        var responder: UIResponder? = self
        while let currentResponder = responder {
            if currentResponder.responds(to: selector) {
                currentResponder.perform(selector, with: url)
                return true
            }
            responder = currentResponder.next
        }
        return false
    }

    private func kindFor(url: URL) -> String {
        let value = url.absoluteString.lowercased()
        if value.contains("maps") || value.contains("booking") || value.contains("airbnb") || value.contains("hotel") || value.contains("train") || value.contains("flight") { return "trip" }
        if value.contains("calendar") || value.contains("agenda") || value.contains("event") { return "agenda" }
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
