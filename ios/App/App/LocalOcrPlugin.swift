import Capacitor
import Foundation
import ImageIO
import UIKit
import Vision

@objc(LocalOcrPlugin)
public class LocalOcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LocalOcrPlugin"
    public let jsName = "LocalOcr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise)
    ]

    @objc func recognize(_ call: CAPPluginCall) {
        guard let imageBase64 = call.getString("imageBase64"), !imageBase64.isEmpty else {
            call.reject("Image requise.")
            return
        }

        guard let imageData = decodeImageData(imageBase64),
              let image = UIImage(data: imageData),
              let cgImage = image.cgImage else {
            call.reject("Image illisible.")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    call.reject("Lecture OCR impossible.", nil, error)
                    return
                }

                let observations = request.results as? [VNRecognizedTextObservation] ?? []
                let text = observations
                    .compactMap { $0.topCandidates(1).first?.string }
                    .joined(separator: "\n")

                call.resolve(["text": text])
            }

            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["fr-FR", "en-US"]

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: self.visionOrientation(from: image.imageOrientation), options: [:])
            do {
                try handler.perform([request])
            } catch {
                call.reject("Lecture OCR impossible.", nil, error)
            }
        }
    }

    private func decodeImageData(_ imageBase64: String) -> Data? {
        let cleaned = imageBase64.components(separatedBy: ",").last ?? imageBase64
        return Data(base64Encoded: cleaned)
    }

    private func visionOrientation(from orientation: UIImage.Orientation) -> CGImagePropertyOrientation {
        switch orientation {
        case .up:
            return .up
        case .down:
            return .down
        case .left:
            return .left
        case .right:
            return .right
        case .upMirrored:
            return .upMirrored
        case .downMirrored:
            return .downMirrored
        case .leftMirrored:
            return .leftMirrored
        case .rightMirrored:
            return .rightMirrored
        @unknown default:
            return .up
        }
    }
}
