import Capacitor
import Foundation

private struct SharedInboxFile: Codable {
    let name: String
    let type: String
    let path: String
}

private struct SharedInboxManifest: Codable {
    let id: String
    let title: String
    let text: String
    let url: String
    let target: String
    let files: [SharedInboxFile]
}

@objc(SharedInboxPlugin)
public class SharedInboxPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharedInboxPlugin"
    public let jsName = "SharedInbox"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "consume", returnType: CAPPluginReturnPromise)
    ]

    @objc func consume(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("Identifiant de partage manquant.")
            return
        }
        guard let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: MyFamilyQuickActionStore.appGroupIdentifier) else {
            call.reject("Le partage sécurisé n’est pas encore disponible sur cet appareil.")
            return
        }
        let inbox = root.appendingPathComponent("ShareInbox", isDirectory: true)
        let manifestURL = inbox.appendingPathComponent("\(id).json")
        guard let data = try? Data(contentsOf: manifestURL), let manifest = try? JSONDecoder().decode(SharedInboxManifest.self, from: data) else {
            call.reject("Le contenu partagé n’est plus disponible.")
            return
        }

        let files: [[String: String]] = manifest.files.compactMap { item in
            let url = inbox.appendingPathComponent(item.path)
            guard let fileData = try? Data(contentsOf: url) else { return nil }
            return [
                "name": item.name,
                "type": item.type,
                "base64": fileData.base64EncodedString()
            ]
        }
        manifest.files.forEach { try? FileManager.default.removeItem(at: inbox.appendingPathComponent($0.path)) }
        try? FileManager.default.removeItem(at: manifestURL)
        call.resolve([
            "id": manifest.id,
            "title": manifest.title,
            "text": manifest.text,
            "url": manifest.url,
            "target": manifest.target,
            "files": files
        ])
    }
}
