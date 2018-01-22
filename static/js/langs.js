var lang = new Lang();
lang.dynamic('fr', 'static/js/langpack/fr.json');
lang.dynamic('kr', 'static/js/langpack/kr.json');
lang.dynamic('jp', 'static/js/langpack/jp.json');
lang.dynamic('de', 'static/js/langpack/de.json');
lang.dynamic('ru', 'static/js/langpack/ru.json');
lang.dynamic('es', 'static/js/langpack/es.json');
lang.dynamic('pt', 'static/js/langpack/pt.json');
lang.dynamic('zh-cn', 'static/js/langpack/zh-cn.json');
lang.dynamic('zh-tw', 'static/js/langpack/zh-tw.json');
lang.init({
    defaultLang: 'us',
    cookie: {
        name: 'CopiesLangCookie',
        expiry: 365,
        path: '/'
    },
    allowCookieOverride: true
});
function cll(l) {
    window.lang.change(l);
    setTimeout(function() {
        window.location.reload();
    }, 500);
}