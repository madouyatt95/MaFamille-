import Foundation
import Capacitor

class BridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleQuickMicroRequest),
            name: .myFamilyPlusQuickMicroRequested,
            object: nil
        )
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativeSpeechPlugin())
        bridge?.registerPluginInstance(AppStoreBillingPlugin())
        bridge?.registerPluginInstance(LocalOcrPlugin())
        bridge?.registerPluginInstance(SharedInboxPlugin())
        bridge?.registerPluginInstance(FamilyImagePickerPlugin())
        bridge?.registerPluginInstance(FamilyQrPlugin())
        notifyPendingQuickAction()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleQuickMicroRequest() {
        notifyPendingQuickAction()
    }

    private func notifyPendingQuickAction() {
        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.evaluateJavaScript(
                "window.dispatchEvent(new CustomEvent('myfamilyplus:native-action-available'));",
                completionHandler: nil
            )
        }
    }
}
