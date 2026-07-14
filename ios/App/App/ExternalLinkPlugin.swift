import Capacitor
import Foundation
import UIKit

@objc(ExternalLinkPlugin)
public class ExternalLinkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ExternalLinkPlugin"
    public let jsName = "ExternalLink"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let rawUrl = call.getString("url"),
              let url = URL(string: rawUrl),
              ["https", "http"].contains(url.scheme?.lowercased() ?? "") else {
            call.reject("Le lien est invalide.")
            return
        }

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened {
                    call.resolve(["opened": true])
                } else {
                    call.reject("Le lien n'a pas pu être ouvert.")
                }
            }
        }
    }
}
