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
        flushPendingQuickMicroRequest()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleQuickMicroRequest() {
        flushPendingQuickMicroRequest()
    }

    private func flushPendingQuickMicroRequest() {
        let pendingAction = UserDefaults.standard.string(forKey: "mf_pending_quick_action_native")
        let hasPendingMicro = UserDefaults.standard.bool(forKey: "mf_pending_quick_micro_native")

        guard hasPendingMicro || pendingAction != nil else {
            return
        }

        UserDefaults.standard.removeObject(forKey: "mf_pending_quick_micro_native")
        UserDefaults.standard.removeObject(forKey: "mf_pending_quick_action_native")

        [0.0, 0.15, 0.4, 0.9, 1.8].forEach { delay in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                let script: String
                if hasPendingMicro {
                    script = """
                    try {
                      sessionStorage.setItem('mf_pending_quick_micro', 'true');
                      localStorage.setItem('mf_pending_quick_micro', 'true');
                      window.dispatchEvent(new CustomEvent('myfamilyplus:quick-micro'));
                    } catch (error) {
                      window.location.href = '/quick-micro';
                    }
                    """
                } else {
                    let action = pendingAction ?? "open-micro"
                    script = """
                    try {
                      window.location.href = '/app?action=\(action)';
                    } catch (error) {
                      window.location.href = '/app';
                    }
                    """
                }
                self?.bridge?.webView?.evaluateJavaScript(script, completionHandler: nil)
            }
        }
    }
}
