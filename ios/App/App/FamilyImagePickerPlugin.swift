import Capacitor
import Foundation
import UIKit

@objc(FamilyImagePickerPlugin)
public class FamilyImagePickerPlugin: CAPPlugin, CAPBridgedPlugin, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    public let identifier = "FamilyImagePickerPlugin"
    public let jsName = "FamilyImagePicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?
    private var pickerController: UIImagePickerController?

    @objc func pick(_ call: CAPPluginCall) {
        guard activeCall == nil else {
            call.reject("Une sélection est déjà ouverte.")
            return
        }

        let requestedSource = call.getString("source") ?? "library"
        let source: UIImagePickerController.SourceType = requestedSource == "camera" ? .camera : .photoLibrary
        guard UIImagePickerController.isSourceTypeAvailable(source) else {
            call.reject(source == .camera ? "L’appareil photo n’est pas disponible." : "La photothèque n’est pas disponible.")
            return
        }

        activeCall = call
        DispatchQueue.main.async { [weak self] in
            guard let self, let viewController = self.bridge?.viewController else {
                self?.finish(with: "Impossible d’ouvrir le sélecteur.")
                return
            }
            let picker = UIImagePickerController()
            picker.sourceType = source
            picker.mediaTypes = ["public.image"]
            picker.allowsEditing = false
            picker.delegate = self
            self.pickerController = picker
            viewController.present(picker, animated: true)
        }
    }

    public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        dismissPicker { [weak self] in self?.finish(with: "Sélection annulée.") }
    }

    public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        guard let image = info[.originalImage] as? UIImage,
              let data = image.jpegData(compressionQuality: 0.88) else {
            dismissPicker { [weak self] in self?.finish(with: "Image illisible.") }
            return
        }

        let name = (info[.imageURL] as? URL)?.lastPathComponent ?? "scan-\(Int(Date().timeIntervalSince1970)).jpg"
        let base64 = data.base64EncodedString()
        dismissPicker { [weak self] in
            guard let self, let call = self.activeCall else { return }
            self.activeCall = nil
            call.resolve([
                "name": name,
                "type": "image/jpeg",
                "base64": base64
            ])
        }
    }

    private func dismissPicker(completion: @escaping () -> Void) {
        guard let picker = pickerController else {
            completion()
            return
        }
        picker.dismiss(animated: true) { [weak self] in
            self?.pickerController = nil
            completion()
        }
    }

    private func finish(with message: String) {
        guard let call = activeCall else { return }
        activeCall = nil
        pickerController = nil
        call.reject(message)
    }
}
