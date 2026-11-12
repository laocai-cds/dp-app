import UIKit
import WebKit

func jsq(_ s: String) -> String {
    guard let d = try? JSONSerialization.data(withJSONObject: [s]), let t = String(data: d, encoding: .utf8) else { return "\"\"" }
    return String(t.dropFirst().dropLast())
}
func jsonStr(_ o: [String: Any]) -> String {
    guard let d = try? JSONSerialization.data(withJSONObject: o), let t = String(data: d, encoding: .utf8) else { return "{}" }
    return t
}

final class VC: UIViewController, WKNavigationDelegate, WKUIDelegate {
    var web: WKWebView!
    let status = UILabel()
    var cfg: [String: Any] = [:]
    let ud = UserDefaults.standard
    let PRE = "(()=>{window.prompt=()=>null;window.confirm=()=>true;})();"

    func readAsset(_ rel: String) -> String? {
        return try? String(contentsOfFile: Bundle.main.bundlePath + "/" + rel, encoding: .utf8)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { return .lightContent }

    func btn(_ t: String, _ bg: UIColor, _ fg: UIColor, _ size: CGFloat, _ act: @escaping () -> Void) -> UIButton {
        let b = UIButton(type: .system)
        b.setTitle(t, for: .normal)
        b.setTitleColor(fg, for: .normal)
        b.backgroundColor = bg
        b.titleLabel?.font = UIFont.boldSystemFont(ofSize: size)
        b.titleLabel?.adjustsFontSizeToFitWidth = true
        b.titleLabel?.minimumScaleFactor = 0.7
        b.layer.cornerRadius = 9
        b.layer.borderWidth = 1
        b.layer.borderColor = UIColor(white: 1, alpha: 0.2).cgColor
        b.addAction(UIAction { _ in act() }, for: .touchUpInside)
        b.heightAnchor.constraint(equalToConstant: 28).isActive = true
        return b
    }

    func hrow(_ views: [UIView]) -> UIStackView {
        let s = UIStackView(arrangedSubviews: views)
        s.axis = .horizontal
        s.distribution = .fillEqually
        s.spacing = 4
        return s
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.059, green: 0.227, blue: 0.431, alpha: 1)
        if let t = readAsset("config.json"), let d = t.data(using: .utf8),
           let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { cfg = o }

        status.textColor = .white
        status.font = UIFont.systemFont(ofSize: 9)
        status.numberOfLines = 2
        status.text = "1) Đăng nhập gqtthc ở khung bên dưới  2) Bấm nút xã để lấy số liệu"

        let light = UIColor(red: 0.91, green: 0.945, blue: 1, alpha: 1)
        let dark = UIColor(red: 0.059, green: 0.227, blue: 0.431, alpha: 1)
        let orange = UIColor(red: 0.91, green: 0.514, blue: 0.102, alpha: 1)
        let blue = UIColor(red: 0.18, green: 0.42, blue: 0.69, alpha: 1)
        let title = UILabel(); title.text = "ĐỒNG BỘ ĐẢNG PHÍ 2026"; title.textColor = .white; title.textAlignment = .center; title.font = UIFont.boldSystemFont(ofSize: 12)
        let author = UILabel(); author.text = "Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai"; author.textColor = UIColor(red: 0.75, green: 0.84, blue: 0.96, alpha: 1); author.textAlignment = .center; author.font = UIFont.systemFont(ofSize: 9); author.adjustsFontSizeToFitWidth = true

        let ctl = hrow([
            btn("⟳  Tải lại", blue, .white, 11) { [weak self] in self?.web.reload() },
            btn("🔑  Mã chung", blue, .white, 11) { [weak self] in
                guard let s = self else { return }
                s.ask("Nhập Mã chung (lưu trên máy này)", true, s.ud.string(forKey: "__all") ?? "") { v in
                    s.ud.set(v, forKey: "__all"); s.say(v.isEmpty ? "Đã xóa mã chung" : "Đã lưu mã chung") }
            }
        ])

        var rows: [UIView] = [title, author, ctl]
        let xa = (cfg["xa"] as? [[String: Any]]) ?? []
        var i = 0
        while i < xa.count {
            var bs: [UIView] = []
            for j in i..<min(i + 4, xa.count) {
                let x = xa[j]
                bs.append(btn((x["label"] as? String) ?? "", orange, .white, 9) { [weak self] in self?.run(x) })
            }
            while bs.count < 4 { bs.append(UIView()) }
            rows.append(hrow(bs))
            i += 4
        }

        let conf = WKWebViewConfiguration()
        conf.websiteDataStore = WKWebsiteDataStore.default()
        web = WKWebView(frame: .zero, configuration: conf)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isOpaque = false
        web.backgroundColor = .white
        web.setContentHuggingPriority(.defaultLow, for: .vertical)

        let stack = UIStackView(arrangedSubviews: rows + [web])
        stack.axis = .vertical
        stack.spacing = 3
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        let g = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: g.topAnchor, constant: 4),
            stack.bottomAnchor.constraint(equalTo: g.bottomAnchor),
            stack.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 6),
            stack.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -6)
        ])
        stack.setCustomSpacing(8, after: ctl)

        let home = (cfg["home"] as? String) ?? "https://gqtthc.dcs.vn/"
        if let u = URL(string: home) { web.load(URLRequest(url: u)) }
    }

    func say(_ m: String) { DispatchQueue.main.async { self.status.text = m } }

    func ask(_ title: String, _ secret: Bool, _ initial: String, _ done: @escaping (String) -> Void) {
        let a = UIAlertController(title: title, message: nil, preferredStyle: .alert)
        a.addTextField { tf in
            tf.isSecureTextEntry = secret
            tf.text = initial
            tf.autocapitalizationType = .none
            tf.autocorrectionType = .no
        }
        a.addAction(UIAlertAction(title: "Hủy", style: .cancel))
        a.addAction(UIAlertAction(title: "Lưu và chạy", style: .default) { _ in
            done((a.textFields?.first?.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines))
        })
        present(a, animated: true)
    }

    func run(_ x: [String: Any]) {
        guard let id = x["id"] as? String, let fn = x["fn"] as? String,
              let key = x["key"] as? String, let file = x["file"] as? String else { return }
        let arg = x["arg"]
        let needApi = (fn == "dpBookmarklet")
        guard let url = web.url?.absoluteString, url.hasPrefix("https://gqtthc.dcs.vn/") else {
            say("Hãy mở và đăng nhập trang gqtthc.dcs.vn trước."); return
        }
        let all = ud.string(forKey: "__all") ?? ""
        var apiUrl = ""
        if needApi {
            apiUrl = ud.string(forKey: "api_" + id) ?? ((arg as? String) ?? "")
            if apiUrl.range(of: "^https://script\\.google\\.com/macros/s/[^/]+/exec$", options: .regularExpression) == nil {
                ask("Dán địa chỉ Apps Script (…/exec) của trang tthc", false, "") { [weak self] v in
                    self?.ud.set(v, forKey: "api_" + id); self?.run(x) }
                return
            }
        }
        var code = ud.string(forKey: "code_" + id) ?? ""
        if code.isEmpty && !all.isEmpty { code = all }
        if code.isEmpty {
            ask("Nhập mã đồng bộ của " + ((x["label"] as? String) ?? id) + " (chỉ 1 lần)", true, "") { [weak self] v in
                self?.ud.set(v, forKey: "code_" + id); self?.run(x) }
            return
        }
        let chung = (cfg["chung"] as? String) ?? ""
        let useChung = !needApi && !all.isEmpty && !chung.isEmpty
        if useChung { code = all }

        var argJs: String
        if needApi {
            argJs = jsq(apiUrl)
        } else if var a = arg as? [String: Any] {
            if useChung { a["chung"] = chung }
            argJs = jsonStr(a)
        } else {
            argJs = jsq("")
        }
        guard let bm = readAsset(file) else { say("Thiếu file " + file); return }
        let js = PRE + "(()=>{try{localStorage.setItem(" + jsq(key) + "," + jsq(code) + ")}catch(e){}\n" + bm + "\n(" + fn + ")(" + argJs + ")})();void 0"
        web.evaluateJavaScript(js) { _, err in
            if let e = err { self.say("⚠ Lỗi: " + e.localizedDescription) }
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Hủy", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil { webView.load(navigationAction.request) }
        return nil
    }
}

@objc(AppDelegate)
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let w = UIWindow(frame: UIScreen.main.bounds)
        w.rootViewController = VC()
        w.makeKeyAndVisible()
        window = w
        return true
    }
}

UIApplicationMain(CommandLine.argc, CommandLine.unsafeArgv, nil, NSStringFromClass(AppDelegate.self))
