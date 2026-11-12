package vn.laocai.dp;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends Activity {
    interface Done { void ok(String v); }

    WebView web;
    SharedPreferences sp;
    JSONObject cfg;
    TextView status;

    static final String PRE = "(()=>{window.prompt=()=>null;window.confirm=()=>true;})();";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        sp = getSharedPreferences("dp", 0);
        try { cfg = new JSONObject(read("config.json")); } catch (Exception e) { cfg = new JSONObject(); }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF0F3A6E);
        root.setFitsSystemWindows(true);

        TextView title = new TextView(this);
        title.setText("ĐỒNG BỘ ĐẢNG PHÍ 2026");
        title.setTextColor(Color.WHITE);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setTextSize(12);
        title.setGravity(Gravity.CENTER);
        title.setPadding(dp(6), dp(3), dp(6), 0);
        root.addView(title);
        TextView author = new TextView(this);
        author.setText("Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai");
        author.setTextColor(0xFFBFD6F5);
        author.setTextSize(8);
        author.setSingleLine(true);
        author.setGravity(Gravity.CENTER);
        author.setPadding(dp(6), 0, dp(6), dp(2));
        root.addView(author);

        status = new TextView(this);
        status.setTextColor(0xFFE6EEF9);
        status.setTextSize(8);
        status.setSingleLine(true);
        status.setEllipsize(android.text.TextUtils.TruncateAt.END);
        status.setPadding(dp(6), dp(1), dp(6), dp(1));
        status.setText("1) Đăng nhập gqtthc ở khung bên dưới  2) Bấm nút xã để lấy số liệu");

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(dp(4), 0, dp(4), dp(2));
        root.addView(row, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        row.addView(btn("⟳  Tải lại", 0xFF2E6BB0, Color.WHITE, v -> web.reload()), eq());
        row.addView(btn("🔑  Mã chung", 0xFF2E6BB0, Color.WHITE, v -> ask("Nhập Mã chung (lưu trên máy này)", true, sp.getString("__all", ""), c -> {
            sp.edit().putString("__all", c.trim()).apply();
            say(c.trim().isEmpty() ? "Đã xóa mã chung" : "Đã lưu mã chung");
        })), eq());
        runSel = btn("▶ Chạy (0)", 0xFF1E8E3E, Color.WHITE, v -> runSelected());
        runSel.setVisibility(View.GONE);
        row.addView(runSel, eq());
        JSONArray xa = cfg.optJSONArray("xa");
        if (xa != null) {
            GridLayout grid = new GridLayout(this);
            grid.setColumnCount(4);
            grid.setPadding(dp(2), 0, dp(2), dp(2));
            for (int i = 0; i < xa.length(); i++) {
                final JSONObject x = xa.optJSONObject(i);
                if (x == null) continue;
                final String xid = x.optString("id");
                final Button bt = btn(x.optString("label"), 0xFFE8831A, Color.WHITE, null);
                bt.setOnClickListener(v -> { if (sel.isEmpty()) run(x); else toggle(xid, bt); });
                bt.setOnLongClickListener(v -> { toggle(xid, bt); return true; });
                btns.put(xid, bt);
                items.put(xid, x);
                bt.setTextSize(9);
                bt.setPadding(dp(2), 0, dp(2), 0);
                GridLayout.LayoutParams lp = new GridLayout.LayoutParams(GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, GridLayout.FILL, 1f));
                lp.width = 0;
                lp.height = dp(28);
                lp.setMargins(dp(2), dp(2), dp(2), dp(2));
                bt.setLayoutParams(lp);
                grid.addView(bt);
            }
            root.addView(grid, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        }

        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient());
        web.loadUrl(cfg.optString("home", "https://gqtthc.dcs.vn/"));
    }

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    LinearLayout.LayoutParams eq() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(28), 1f);
        lp.setMargins(dp(2), 0, dp(2), 0);
        return lp;
    }

    StateListDrawable shape(int normal, int pressed) {
        GradientDrawable n = new GradientDrawable();
        n.setColor(normal);
        n.setCornerRadius(dp(8));
        n.setStroke(dp(1), 0x33FFFFFF);
        GradientDrawable p = new GradientDrawable();
        p.setColor(pressed);
        p.setCornerRadius(dp(8));
        StateListDrawable sl = new StateListDrawable();
        sl.addState(new int[]{android.R.attr.state_pressed}, p);
        sl.addState(new int[]{}, n);
        return sl;
    }

    Button btn(String t, int bg, int fg, View.OnClickListener l) {
        Button x = new Button(this);
        x.setText(t);
        x.setAllCaps(false);
        x.setTextSize(10);
        x.setTypeface(Typeface.DEFAULT_BOLD);
        x.setTextColor(fg);
        int dark = Color.rgb(Math.max(0, Color.red(bg) - 40), Math.max(0, Color.green(bg) - 40), Math.max(0, Color.blue(bg) - 40));
        x.setBackground(shape(bg, dark));
        x.setStateListAnimator(null);
        x.setElevation(0);
        x.setPadding(dp(2), 0, dp(2), 0);
        x.setOnClickListener(l);
        return x;
    }

    Button runSel;
    final java.util.LinkedHashSet<String> sel = new java.util.LinkedHashSet<>();
    final java.util.HashMap<String, Button> btns = new java.util.HashMap<>();
    final java.util.HashMap<String, JSONObject> items = new java.util.HashMap<>();

    void paint(String id) {
        Button b = btns.get(id);
        if (b == null) return;
        boolean on = sel.contains(id);
        int bg = on ? 0xFF1E8E3E : 0xFFE8831A;
        int dark = Color.rgb(Math.max(0, Color.red(bg) - 40), Math.max(0, Color.green(bg) - 40), Math.max(0, Color.blue(bg) - 40));
        b.setBackground(shape(bg, dark));
        String t = items.get(id).optString("label");
        b.setText(on ? "✓ " + t : t);
    }

    void toggle(String id, Button b) {
        if (!sel.remove(id)) sel.add(id);
        paint(id);
        runSel.setText("▶ Chạy (" + sel.size() + ")");
        runSel.setVisibility(sel.isEmpty() ? View.GONE : View.VISIBLE);
    }

    void runSelected() {
        final java.util.ArrayList<String> ids = new java.util.ArrayList<>(sel);
        sel.clear();
        runSel.setVisibility(View.GONE);
        android.os.Handler h = new android.os.Handler();
        for (int i = 0; i < ids.size(); i++) {
            final String id = ids.get(i);
            paint(id);
            h.postDelayed(() -> run(items.get(id)), 1500L * i);
        }
    }

    void say(final String m) { runOnUiThread(() -> android.widget.Toast.makeText(this, m, android.widget.Toast.LENGTH_SHORT).show()); }

    String read(String name) throws Exception {
        InputStream in = getAssets().open(name);
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
        in.close();
        return new String(o.toByteArray(), "UTF-8");
    }

    void ask(String hint, boolean secret, String initial, final Done d) {
        final EditText et = new EditText(this);
        et.setHint(hint);
        et.setText(initial == null ? "" : initial);
        et.setInputType(secret ? (InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD) : InputType.TYPE_CLASS_TEXT);
        new AlertDialog.Builder(this)
                .setTitle(hint)
                .setView(et)
                .setPositiveButton("Lưu và chạy", (dlg, w) -> d.ok(et.getText().toString().trim()))
                .setNegativeButton("Hủy", null)
                .show();
    }

    void run(final JSONObject x) {
        try {
            final String id = x.getString("id");
            final String fn = x.getString("fn");
            final String key = x.getString("key");
            Object arg = x.opt("arg");
            boolean needApi = fn.equals("dpBookmarklet");

            String url = web.getUrl();
            if (url == null || !url.startsWith("https://gqtthc.dcs.vn/")) {
                say("Hãy mở và đăng nhập trang gqtthc.dcs.vn trước.");
                return;
            }
            String all = sp.getString("__all", "");

            String apiUrl = "";
            if (needApi) {
                apiUrl = sp.getString("api_" + id, arg instanceof String ? (String) arg : "");
                if (!apiUrl.matches("^https://script\\.google\\.com/macros/s/[^/]+/exec$")) {
                    ask("Dán địa chỉ Apps Script (…/exec) của trang tthc", false, "", v -> {
                        sp.edit().putString("api_" + id, v).apply();
                        run(x);
                    });
                    return;
                }
            }

            String code = sp.getString("code_" + id, "");
            if (code.isEmpty() && !all.isEmpty()) code = all;
            if (code.isEmpty()) {
                ask("Nhập mã đồng bộ của " + x.optString("label") + " (chỉ 1 lần)", true, "", v -> {
                    sp.edit().putString("code_" + id, v).apply();
                    run(x);
                });
                return;
            }

            String chung = cfg.optString("chung", "");
            boolean useChung = !needApi && !all.isEmpty() && !chung.isEmpty();
            if (useChung) code = all;

            String argJs;
            if (needApi) {
                argJs = JSONObject.quote(apiUrl);
            } else if (arg instanceof JSONObject) {
                JSONObject a = new JSONObject(arg.toString());
                if (useChung) a.put("chung", chung);
                argJs = a.toString();
            } else {
                argJs = JSONObject.quote(String.valueOf(arg));
            }

            String bm = read(x.getString("file"));
            String js = PRE + "(()=>{try{localStorage.setItem(" + JSONObject.quote(key) + "," + JSONObject.quote(code) + ")}catch(e){}\n"
                    + bm + "\n(" + fn + ")(" + argJs + ")})();void 0";
            web.evaluateJavascript(js, null);
        } catch (Exception e) {
            say("⚠ Lỗi: " + e.getMessage());
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
