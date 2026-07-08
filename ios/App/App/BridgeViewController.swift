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
        guard UserDefaults.standard.bool(forKey: "mf_pending_quick_micro_native") else {
            return
        }

        UserDefaults.standard.removeObject(forKey: "mf_pending_quick_micro_native")

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            let script = """
            try {
              sessionStorage.setItem('mf_pending_quick_micro', 'true');
              window.dispatchEvent(new CustomEvent('myfamilyplus:quick-micro'));
            } catch (error) {
              window.location.href = '/quick-micro';
            }
            """
            self?.bridge?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }
}
