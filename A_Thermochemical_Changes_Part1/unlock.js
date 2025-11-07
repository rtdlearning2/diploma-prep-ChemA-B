/* iSpring unlock – non-destructive runtime patch
 * Делает навигацию доступной, переопределяя метод проверки ограничений.
 * Ничего в player.js не меняет, только «подменяет» метод после загрузки.
 */
(function () {
  var MAX_TRIES = 100;      // ~20 секунд при шаге 200мс
  var INTERVAL_MS = 200;
  var tried = 0;
  var patched = false;

  function tryPatchCtor(ctor, tag) {
    try {
      if (!ctor || !ctor.prototype) return false;
      var proto = ctor.prototype;

      // Ищем именно метод Ne(...) – он возвращает причину блокировки (или null)
      if (typeof proto.Ne === "function") {
        // Доп. сигнатуры настоящего контроллера: gotoNextSlide/play/pause и т.п.
        var looksRight =
          typeof proto.gotoNextSlide === "function" ||
          typeof proto.gotoPreviousSlide === "function" ||
          typeof proto.play === "function" ||
          typeof proto.pause === "function";

        if (!looksRight) {
          // Не идеальный признак, но лучше чем ничего
          // Патчим всё равно, т.к. часть сборок может быть урезана
        }

        if (!proto.__origNe) {
          proto.__origNe = proto.Ne;
          proto.Ne = function () {
            // Всегда «разрешаем» действие навигации
            return null;
          };
          console.log("[unlock] Patched Ne on", tag || ctor.name || "<anonymous>");
        }
        return true;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  function scanGlobals() {
    // 1) Явное имя из сборки (встречается часто)
    if (typeof window.Lx === "function" && tryPatchCtor(window.Lx, "Lx")) {
      return true;
    }

    // 2) Фолбэк: ищем любой глобальный конструктор с прототипом, где есть Ne(...)
    //   и характерные методы контроллера (gotoNextSlide/play/...)
    for (var k in window) {
      // Пропускаем очевидные объекты/DOM/API
      if (!Object.prototype.hasOwnProperty.call(window, k)) continue;
      if (/^(window|document|Navigator|History|Location|Math|Number|String|Array|Object|console|performance|Promise|Symbol|Intl|JSON|RegExp|Date)$/i.test(k)) {
        continue;
      }
      var v = window[k];
      if (typeof v === "function" && v.prototype) {
        if (tryPatchCtor(v, k)) return true;
      }
    }
    return false;
  }

  function tick() {
    if (patched) return;
    tried++;
    if (scanGlobals()) {
      patched = true;
      return;
    }
    if (tried >= MAX_TRIES) {
      console.warn("[unlock] Failed to patch after", MAX_TRIES, "tries.");
      return;
    }
    setTimeout(tick, INTERVAL_MS);
  }

  // Стартуем после DOMContentLoaded, чтобы скрипты плеера успели подключиться
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tick, { once: true });
  } else {
    tick();
  }
})();
