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
import android.widget.CheckBox;
import android.widget.ScrollView;
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

    static final String BATCH = "(()=>{if(window.__dpB)return;window.__dpB=1;const st=document.createElement('style');st.textContent='[data-dplbl]::before{content:attr(data-dplbl);display:block;font-weight:800;color:#ffd27a;margin-bottom:2px}';document.head.appendChild(st);const boxes=()=>[...document.body.children].filter(e=>e.style&&e.style.right==='14px'&&e.style.zIndex==='2147483647');setInterval(()=>{const B=window.__dpBatch;if(B){for(const ov of document.body.querySelectorAll(':scope>div')){if(/inset:\\s*0/.test(ov.style.cssText)){const ok=ov.querySelector('[data-ok]');if(ok&&!ov.dataset.dpa){ov.dataset.dpa=1;ov.style.display='none';ok.click()}}}}let y=14;const R=window.__dpRes=window.__dpRes||{};for(const b of boxes()){if(!b.dataset.dplbl&&window.__dpCur)b.dataset.dplbl=window.__dpCur;const l=b.dataset.dplbl,bg=b.style.background||'';const tx=(b.textContent||'').trim();if(l){if(/^✓/.test(tx))R[l]='ok';else if(/^[✕⚠]/.test(tx))R[l]='bad';else if(/15,\\s*138,\\s*60|0f8a3c/i.test(bg))R[l]='ok';else if(/165,\\s*13,\\s*38|a50d26/i.test(bg))R[l]='bad'}if(B){b.style.top=y+'px';b.style.maxWidth='300px';b.style.padding='6px 10px';b.style.fontSize='12px';y+=b.offsetHeight+6}}},250)})();";
    static final String PRE = "(()=>{window.prompt=()=>null;window.confirm=()=>true;})();";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (getActionBar() != null) getActionBar().hide();
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
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER);
        title.setPadding(dp(6), dp(3), dp(6), 0);
        root.addView(title);
        TextView author = new TextView(this);
        String ver = "";
        try { android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0); verTxt = "v" + pi.versionName + " (" + pi.versionCode + ")"; ver = "  ·  " + verTxt; } catch (Exception e) { }
        author.setText("Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai" + ver);
        author.setTextColor(0xFFFFD27A);
        author.setTextSize(11);
        author.setSingleLine(true);
        author.setGravity(Gravity.CENTER);
        author.setPadding(dp(6), 0, dp(6), dp(2));
        author.setOnClickListener(v -> checkUpdate(true));
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
        row.setPadding(dp(4), dp(8), dp(4), dp(4));
        root.addView(row, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        row.addView(btn("⟳ Tải lại", 0xFF2E6BB0, Color.WHITE, v -> web.loadUrl(cfg.optString("home", "https://gqtthc.dcs.vn/"))), eq());
        row.addView(btn("🔑 Mã", 0xFF2E6BB0, Color.WHITE, v -> ask("Nhập Mã chung (lưu trên máy này)", true, sp.getString("__all", ""), c -> {
            sp.edit().putString("__all", c.trim()).apply();
            say(c.trim().isEmpty() ? "Đã xóa mã chung" : "Đã lưu mã chung");
        })), eq());
        pickBtn = btn("▼ Chọn", 0xFFE8831A, Color.WHITE, v -> pick());
        row.addView(pickBtn, eq());
        goBtn = btn("▶ Chạy", 0xFF1E8E3E, Color.WHITE, v -> runSelected(new java.util.ArrayList<>(chosen)));
        goBtn.setSingleLine(false);
        goBtn.setMaxLines(2);
        goBtn.setTextSize(12);
        goBtn.setGravity(Gravity.CENTER);
        row.addView(goBtn, eq());
        /* Thanh cập nhật: chỉ hiện khi trên GitHub có bản mới hơn bản đang cài */
        updBtn = btn("⟳ Kiểm tra cập nhật · " + verTxt, 0xFF2E6BB0, Color.WHITE, v -> { if (newCode > installedCode()) startUpdate(); else checkUpdate(true); });
        updBtn.setTextSize(13);
        LinearLayout.LayoutParams ulp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50));
        ulp.setMargins(dp(6), dp(4), dp(6), dp(8));
        root.addView(updBtn, ulp);
        JSONArray xa = cfg.optJSONArray("xa");
        if (xa != null) {
            for (int i = 0; i < xa.length(); i++) {
                JSONObject x = xa.optJSONObject(i);
                if (x != null) items.put(x.optString("id"), x);
            }
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
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(WebSettings.getDefaultUserAgent(this).replace("; wv", "").replace("Version/4.0 ", ""));
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r != null && r.isForMainFrame()) showLoadError(String.valueOf(e.getDescription()) + " (" + e.getErrorCode() + ") — " + r.getUrl().getHost());
            }
            @Override
            public void onReceivedHttpError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceResponse e) {
                if (r != null && r.isForMainFrame() && e.getStatusCode() >= 400) showLoadError("Máy chủ trả mã " + e.getStatusCode());
            }
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v, android.webkit.WebResourceRequest r) {
                /* Học thêm các tên miền *.dcs.vn mà trang gqtthc gọi tới, để lần sau mở trước (xem warmHost) */
                try {
                    String h = r.getUrl().getHost();
                    if (isDcs(h) && !h.equals("gqtthc.dcs.vn") && warmHosts.add(h)) {
                        final String hh = h;
                        java.util.HashSet<String> copy;
                        synchronized (warmHosts) { copy = new java.util.HashSet<>(warmHosts); }
                        sp.edit().putStringSet("warm", copy).apply();
                        runOnUiThread(() -> warmHost(hh, null));
                    }
                } catch (Exception e) { }
                return null;
            }
            @Override
            public void onReceivedSslError(WebView v, android.webkit.SslErrorHandler h, android.net.http.SslError e) {
                String host = android.net.Uri.parse(e.getUrl()).getHost();
                String why = sslWhy(e.getPrimaryError());
                if (isDcs(host)) {
                    // Máy chủ dcs.vn thiếu chứng chỉ trung gian: bỏ qua lỗi SSL, chỉ cho đúng tên miền này.
                    h.proceed();
                    status.setText("ℹ SSL " + host + ": " + why + " (đã bỏ qua)");
                } else {
                    h.cancel();
                    showLoadError("Chứng chỉ SSL không hợp lệ: " + host + " — " + why);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient());
        warmThenLoad(cfg.optString("home", "https://gqtthc.dcs.vn/"));
        checkUpdate(false);
    }

    final java.util.Set<String> warmHosts = java.util.Collections.synchronizedSet(new java.util.LinkedHashSet<String>());

    String sslWhy(int c) {
        switch (c) {
            case android.net.http.SslError.SSL_UNTRUSTED: return "chứng chỉ không tin cậy (thiếu chứng chỉ trung gian)";
            case android.net.http.SslError.SSL_EXPIRED: return "chứng chỉ hết hạn";
            case android.net.http.SslError.SSL_IDMISMATCH: return "sai tên miền";
            case android.net.http.SslError.SSL_NOTYETVALID: return "chứng chỉ chưa có hiệu lực (kiểm tra ngày giờ máy)";
            case android.net.http.SslError.SSL_DATE_INVALID: return "ngày giờ không hợp lệ";
            default: return "mã " + c;
        }
    }

    boolean isDcs(String h) {
        /* dcs.vn: máy chủ gqtthc; dancuquocgia.gov.vn: cổng đăng nhập SSO (sso.dancuquocgia.gov.vn) - cả hai thiếu chứng chỉ trung gian */
        return h != null && (h.equals("dcs.vn") || h.endsWith(".dcs.vn") || h.equals("dancuquocgia.gov.vn") || h.endsWith(".dancuquocgia.gov.vn"));
    }

    /* Máy chủ dcs.vn thiếu chứng chỉ trung gian. WebView chỉ nhớ "bỏ qua lỗi SSL" theo từng tên miền và chỉ khi tên miền đó
       được mở trực tiếp; lệnh gọi API (fetch/XHR) của trang tới tên miền khác (vd gateway-gqtthc.dcs.vn: đăng nhập, lấy số liệu)
       sẽ bị chặn. Vì vậy mở trước từng tên miền trong một WebView ẩn, rồi mới tải trang chính. */
    void warmHost(final String host, final Runnable done) {
        final android.os.Handler hd = new android.os.Handler();
        final WebView w = new WebView(this);
        final boolean[] fin = {false};
        final Runnable finish = () -> {
            if (fin[0]) return;
            fin[0] = true;
            hd.post(() -> { try { w.stopLoading(); w.destroy(); } catch (Exception e) { } });
            if (done != null) done.run();
        };
        w.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedSslError(WebView v, android.webkit.SslErrorHandler h, android.net.http.SslError e) {
                if (isDcs(android.net.Uri.parse(e.getUrl()).getHost())) h.proceed(); else h.cancel();
            }
            @Override
            public void onPageFinished(WebView v, String url) { finish.run(); }
            @Override
            public void onReceivedError(WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) {
                if (r != null && r.isForMainFrame()) finish.run();
            }
        });
        w.loadUrl("https://" + host + "/");
        hd.postDelayed(finish, 7000);
    }

    void warmThenLoad(final String home) {
        final java.util.LinkedHashSet<String> hs = new java.util.LinkedHashSet<>();
        hs.add("gateway-gqtthc.dcs.vn");
        hs.add("sso.dancuquocgia.gov.vn");
        hs.addAll(sp.getStringSet("warm", new java.util.HashSet<String>()));
        warmHosts.addAll(hs);
        final int[] left = {hs.size()};
        final boolean[] loaded = {false};
        final Runnable go = () -> { if (loaded[0]) return; loaded[0] = true; web.loadUrl(home); };
        new android.os.Handler().postDelayed(go, 9000);
        for (String h : hs) warmHost(h, () -> { if (--left[0] <= 0) go.run(); });
    }

    void showLoadError(String why) {
        status.setText("⚠ Không mở được gqtthc: " + why + " — bấm ⟳ Tải lại");
        String h = "<meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;padding:24px;text-align:center'>"
            + "<h3>Không mở được trang gqtthc.dcs.vn</h3><p>" + android.text.TextUtils.htmlEncode(why)
            + "</p><p>Kiểm tra Wi-Fi/4G rồi bấm nút <b>⟳ Tải lại</b> ở trên.</p></body>";
        web.loadDataWithBaseURL(null, h, "text/html", "UTF-8", null);
    }

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    LinearLayout.LayoutParams eq() {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, dp(50), 1f);
        lp.setMargins(dp(4), 0, dp(4), 0);
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
        x.setTextSize(13);
        x.setSingleLine(true);
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

    final java.util.LinkedHashMap<String, JSONObject> items = new java.util.LinkedHashMap<>();
    final java.util.HashSet<String> chosen = new java.util.HashSet<>();

    void pick() {
        final ScrollView sv = new ScrollView(this);
        final LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(16), dp(8), dp(16), dp(8));
        sv.addView(box);
        final java.util.ArrayList<CheckBox> cbs = new java.util.ArrayList<>();
        final CheckBox all = new CheckBox(this);
        all.setText("Chọn tất cả");
        all.setTypeface(Typeface.DEFAULT_BOLD);
        all.setTextSize(15);
        box.addView(all);
        for (final String id : items.keySet()) {
            final CheckBox c = new CheckBox(this);
            String lb = items.get(id).optString("label");
            long tm = sp.getLong("tm_" + id, 0);
            if (tm > 0) {
                boolean bad = "bad".equals(sp.getString("st_" + id, "ok"));
                String tail = "   " + (bad ? "✕ lỗi " : "✓ ") + hm(tm);
                android.text.SpannableString ss = new android.text.SpannableString(lb + tail);
                ss.setSpan(new android.text.style.RelativeSizeSpan(0.75f), lb.length(), ss.length(), 0);
                ss.setSpan(new android.text.style.ForegroundColorSpan(bad ? 0xFFB3261E : 0xFF0F8A3C), lb.length(), ss.length(), 0);
                c.setText(ss);
            } else c.setText(lb);
            c.setTextSize(15);
            c.setTag(id);
            c.setChecked(chosen.contains(id));
            cbs.add(c);
            box.addView(c);
        }
        final boolean[] busy = {false};
        all.setOnCheckedChangeListener((v, on) -> { if (busy[0]) return; busy[0] = true; for (CheckBox c : cbs) c.setChecked(on); busy[0] = false; });
        for (CheckBox c : cbs) c.setOnCheckedChangeListener((v, on) -> {
            if (busy[0]) return;
            busy[0] = true;
            boolean a = true;
            for (CheckBox k : cbs) if (!k.isChecked()) a = false;
            all.setChecked(a);
            busy[0] = false;
        });
        boolean a0 = !cbs.isEmpty();
        for (CheckBox k : cbs) if (!k.isChecked()) a0 = false;
        all.setChecked(a0);
        new AlertDialog.Builder(this)
                .setTitle("Chọn đơn vị để đồng bộ")
                .setView(sv)
                .setPositiveButton("Xong", null)
                .setOnDismissListener(d -> {
                    chosen.clear();
                    for (CheckBox c : cbs) if (c.isChecked()) chosen.add((String) c.getTag());
                    pickBtn.setText(chosen.isEmpty() ? "▼ Chọn" : "▼ Chọn " + chosen.size());
                })
                .show();
    }

    Button pickBtn, goBtn;
    int runGen = 0;

    /* Giờ hoàn thành: hôm nay chỉ hiện giờ:phút, ngày khác kèm ngày/tháng */
    String hm(long t) {
        java.util.Calendar a = java.util.Calendar.getInstance(), b = java.util.Calendar.getInstance();
        b.setTimeInMillis(t);
        boolean today = a.get(java.util.Calendar.YEAR) == b.get(java.util.Calendar.YEAR) && a.get(java.util.Calendar.DAY_OF_YEAR) == b.get(java.util.Calendar.DAY_OF_YEAR);
        return new java.text.SimpleDateFormat(today ? "HH:mm" : "HH:mm dd/MM", java.util.Locale.US).format(new java.util.Date(t));
    }

    void track(final java.util.ArrayList<String> ids) {
        final int gen = ++runGen;
        final int total = ids.size();
        final long t0 = System.currentTimeMillis();
        final java.util.HashSet<String> stamped = new java.util.HashSet<>();
        goBtn.setText("⏳ 0/" + total);
        final android.os.Handler hh = new android.os.Handler();
        hh.postDelayed(new Runnable() {
            public void run() {
                if (gen != runGen) return;
                web.evaluateJavascript("JSON.stringify(window.__dpRes||{})", v -> {
                    if (gen != runGen) return;
                    int done = 0, bad = 0;
                    try {
                        JSONObject r = new JSONObject(new org.json.JSONTokener(v).nextValue().toString());
                        for (String id : ids) {
                            String st = r.optString(items.get(id).optString("label"), "");
                            if (!st.isEmpty()) {
                                done++;
                                if (st.equals("bad")) bad++;
                                if (stamped.add(id)) sp.edit().putLong("tm_" + id, System.currentTimeMillis()).putString("st_" + id, st).apply();
                            }
                        }
                    } catch (Exception e) { }
                    boolean fin = done >= total;
                    boolean timeout = System.currentTimeMillis() - t0 > 240000;
                    if (fin) sp.edit().putLong("tm_all", System.currentTimeMillis()).apply();
                    goBtn.setText((fin ? "✓ " : "⏳ ") + done + "/" + total + (bad > 0 ? " ⚠" + bad : "") + (fin ? "\n" + hm(System.currentTimeMillis()) : ""));
                    if (!fin && !timeout) hh.postDelayed(this, 1000);
                });
            }
        }, 1500);
    }

    void runSelected(final java.util.ArrayList<String> ids) {
        if (ids.isEmpty()) { say("Chưa chọn đơn vị nào"); return; }
        String u = web.getUrl();
        if (u != null && u.startsWith("https://gqtthc.dcs.vn/")) {
            web.evaluateJavascript(BATCH + "window.__dpRes={};window.__dpCur='';void 0", null);
            track(ids);
        }
        if (ids.size() == 1) { web.evaluateJavascript("window.__dpBatch=false;window.__dpCur=" + JSONObject.quote(items.get(ids.get(0)).optString("label")) + ";void 0", null); run(items.get(ids.get(0))); return; }
        android.os.Handler h = new android.os.Handler();
        web.evaluateJavascript("window.__dpBatch=true;void 0", null);
        for (int i = 0; i < ids.size(); i++) {
            final String id = ids.get(i);
            h.postDelayed(() -> {
                web.evaluateJavascript("window.__dpCur=" + JSONObject.quote(items.get(id).optString("label")) + ";void 0", null);
                run(items.get(id));
            }, 1500L * i);
        }
        h.postDelayed(() -> web.evaluateJavascript("window.__dpBatch=false;void 0", null), 1500L * ids.size() + 8000);
    }

    /* ===== Cập nhật phiên bản mới (APK trên GitHub Releases, tag android-latest) ===== */
    static final String UPD_BASE = "https://github.com/laocai-cds/dp-app/releases/download/android-latest/";
    Button updBtn;
    String verTxt = "";
    String newName = "";
    int newCode = 0;
    boolean downloading = false;

    @SuppressWarnings("deprecation")
    int installedCode() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Exception e) { return 0; }
    }

    /* manual = true: người dùng bấm vào dòng phiên bản để kiểm tra, có báo kết quả */
    void checkUpdate(final boolean manual) {
        if (downloading) return;
        if (manual) { say("Đang kiểm tra bản mới…"); updBtn.setText("⏳ Đang kiểm tra…"); }
        new Thread(() -> {
            try {
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(UPD_BASE + "android.json").openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                c.setUseCaches(false);
                c.setRequestProperty("Cache-Control", "no-cache");
                InputStream in = c.getInputStream();
                ByteArrayOutputStream o = new ByteArrayOutputStream();
                byte[] b = new byte[4096];
                int n;
                while ((n = in.read(b)) > 0) o.write(b, 0, n);
                in.close();
                JSONObject j = new JSONObject(new String(o.toByteArray(), "UTF-8"));
                newCode = j.optInt("versionCode", 0);
                newName = j.optString("versionName", "");
                final boolean has = newCode > installedCode();
                runOnUiThread(() -> {
                    if (has) {
                        updBtn.setText("⬆ Có bản mới " + newName + " (" + newCode + ") — bấm cập nhật");
                        updBtn.setBackground(shape(0xFFD97706, 0xFFB45309));
                    } else {
                        updBtn.setText("✓ Bản mới nhất · " + verTxt);
                        updBtn.setBackground(shape(0xFF1E8E3E, 0xFF166B2F));
                        if (manual) say("Đang là bản mới nhất");
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> updBtn.setText("⟳ Kiểm tra cập nhật · " + verTxt));
                if (manual) say("Không kiểm tra được bản mới (kiểm tra mạng)");
            }
        }).start();
    }

    void startUpdate() {
        if (downloading) return;
        if (android.os.Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(this)
                .setTitle("Cho phép cài đặt ứng dụng")
                .setMessage("Android cần bạn cho phép ứng dụng này cài bản cập nhật. Bấm Mở cài đặt, bật \"Cho phép từ nguồn này\", rồi quay lại bấm cập nhật lần nữa.")
                .setPositiveButton("Mở cài đặt", (d, w) -> startActivity(new android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, android.net.Uri.parse("package:" + getPackageName()))))
                .setNegativeButton("Để sau", null)
                .show();
            return;
        }
        downloading = true;
        updBtn.setEnabled(false);
        updBtn.setText("⏳ Đang tải… 0%");
        new Thread(() -> {
            java.io.File f = new java.io.File(getCacheDir(), "update/DP-DangPhi.apk");
            try {
                f.getParentFile().mkdirs();
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(UPD_BASE + "DP-DangPhi.apk").openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                c.setUseCaches(false);
                final long len = c.getContentLengthLong();
                InputStream in = c.getInputStream();
                java.io.FileOutputStream out = new java.io.FileOutputStream(f);
                byte[] b = new byte[16384];
                int n, last = -1;
                long got = 0;
                while ((n = in.read(b)) > 0) {
                    out.write(b, 0, n);
                    got += n;
                    final int pct = len > 0 ? (int) (got * 100 / len) : 0;
                    if (pct != last && pct % 3 == 0) { last = pct; runOnUiThread(() -> updBtn.setText("⏳ Đang tải… " + pct + "%")); }
                }
                out.close();
                in.close();
                if (len > 0 && f.length() != len) throw new Exception("tải thiếu");
                java.io.FileInputStream chk = new java.io.FileInputStream(f);
                boolean zip = chk.read() == 'P' && chk.read() == 'K';
                chk.close();
                if (!zip) throw new Exception("file không phải APK");
                runOnUiThread(() -> {
                    downloading = false;
                    updBtn.setEnabled(true);
                    updBtn.setText("⬆ Đã tải xong — bấm để cài");
                    installApk();
                });
            } catch (Exception e) {
                f.delete();
                runOnUiThread(() -> {
                    downloading = false;
                    updBtn.setEnabled(true);
                    updBtn.setText("⚠ Tải lỗi — bấm để thử lại");
                });
            }
        }).start();
    }

    void installApk() {
        try {
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_VIEW);
            i.setDataAndType(android.net.Uri.parse("content://vn.laocai.dp.apk/DP-DangPhi.apk"), "application/vnd.android.package-archive");
            i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) { say("Không mở được trình cài đặt"); }
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

            String chungU = cfg.optString("chung", "");
            boolean viaChung = needApi && !all.isEmpty() && !chungU.isEmpty();
            String apiUrl = "";
            if (needApi && viaChung) {
                apiUrl = chungU;
            } else if (needApi) {
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
            if (code.isEmpty() && !all.isEmpty() && (!needApi || viaChung)) code = all;
            if (viaChung) code = all;
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
