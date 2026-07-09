import UIKit
import Capacitor
import FirebaseCore

extension Notification.Name {
    static let myFamilyPlusQuickMicroRequested = Notification.Name("myFamilyPlusQuickMicroRequested")
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if handleMyFamilyPlusURL(url) {
            return true
        }
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    private func handleMyFamilyPlusURL(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == "myfamilyplus" else {
            return false
        }

        let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let host = url.host?.lowercased()
        let path = url.path.lowercased()
        let action = components?.queryItems?.first(where: { $0.name.lowercased() == "action" })?.value?.lowercased()

        let allowedActions: Set<String> = [
            "open-micro",
            "paid",
            "add-expense",
            "scan-receipt",
            "scan-homework",
            "add-grocery",
            "arrival-home",
            "arrival-store",
            "arrival-school"
        ]

        guard host == "quick-micro" || path == "/quick-micro" || action == "open-micro" || (action != nil && allowedActions.contains(action!)) else {
            return false
        }

        if host == "quick-micro" || path == "/quick-micro" || action == "open-micro" {
            UserDefaults.standard.set(true, forKey: "mf_pending_quick_micro_native")
        } else if let action = action {
            UserDefaults.standard.set(action, forKey: "mf_pending_quick_action_native")
        }
        NotificationCenter.default.post(name: .myFamilyPlusQuickMicroRequested, object: nil)
        return true
    }

}
