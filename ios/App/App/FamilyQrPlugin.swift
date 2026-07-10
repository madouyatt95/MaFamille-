import Capacitor
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import UIKit

@objc(FamilyQrPlugin)
public class FamilyQrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FamilyQrPlugin"
    public let jsName = "FamilyQr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "create", returnType: CAPPluginReturnPromise)
    ]

    @objc func create(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), !value.isEmpty,
              let data = value.data(using: .utf8) else {
            call.reject("Lien requis.")
            return
        }

        let filter = CIFilter.qrCodeGenerator()
        filter.message = data
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else {
            call.reject("Impossible de créer le code QR.")
            return
        }

        let scaled = output.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent),
              let png = UIImage(cgImage: cgImage).pngData() else {
            call.reject("Impossible de préparer le code QR.")
            return
        }
        call.resolve(["base64": png.base64EncodedString()])
    }
}
