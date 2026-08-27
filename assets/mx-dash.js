/* ==========================================================================
   MayaApp CDC — Dashboard Diretoria
   Abas + secoes Resumo Executivo / Cadastros / Ativacoes Fisicas.
   Sem dependencias. Graficos em SVG inline.

   Fontes de dados:
     data/cadastros.json  -> manual (tools/add_semana.py), toda segunda
     data/ativacoes.json  -> gerado (tools/build_ativacoes.py)
     data.json            -> Instagram, ja atualizado pela GitHub Action

   A aba Instagram nao e tocada por este arquivo. Ele apenas mostra e esconde
   o painel que a envolve.
   ========================================================================== */
(function () {
  "use strict";

  // ------------------------------------------------------------------- helpers
  var NF = new Intl.NumberFormat("pt-BR");
  var num = function (v) { return v == null || isNaN(v) ? "—" : NF.format(v); };

  function pct(v, casas) {
    if (v == null || isNaN(v)) return "—";
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: casas == null ? 1 : casas,
      maximumFractionDigits: casas == null ? 1 : casas
    }) + "%";
  }

  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function dm(iso) {
    if (!iso) return "—";
    var p = iso.split("-");
    return p[2] + "/" + p[1];
  }

  function periodo(ini, fim) {
    if (!ini || !fim) return "—";
    var a = ini.split("-"), b = fim.split("-");
    var esq = a[1] === b[1] ? a[2] : a[2] + "/" + a[1];
    return esq + "–" + b[2] + "/" + MES[parseInt(b[1], 10) - 1];
  }

  /** Variacao percentual entre dois valores. */
  function delta(atual, anterior) {
    if (atual == null || anterior == null) return null;
    if (anterior === 0) return atual === 0 ? 0 : null; // sem base de comparacao
    return (atual / anterior - 1) * 100;
  }

  /** Badge de variacao. `bom` inverte a cor quando cair e melhor. */
  function badge(d, bom) {
    if (d == null) return '<span class="mx-delta mx-delta--flat">sem base</span>';
    var arred = Math.round(d * 10) / 10;
    if (arred === 0) return '<span class="mx-delta mx-delta--flat">0,0%</span>';
    var positivo = bom === "baixo" ? arred < 0 : arred > 0;
    var cls = positivo ? "up" : "down";
    var seta = arred > 0 ? "▲" : "▼";
    return '<span class="mx-delta mx-delta--' + cls + '">' + seta + " " +
      Math.abs(arred).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%</span>";
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function mount(id, html) {
    var host = document.getElementById(id);
    if (host) host.innerHTML = html;
    return host;
  }

  // ------------------------------------------------------------- KPI builders
  function heroCard(label, valor, sub, ghost) {
    return '<div class="mx-hero-card' + (ghost ? " mx-hero-card--ghost" : "") + '">' +
      '<p class="mx-hero-label">' + esc(label) + "</p>" +
      '<div class="mx-hero-value">' + valor + "</div>" +
      (sub ? '<p class="mx-hero-sub">' + sub + "</p>" : "") +
      "</div>";
  }

  function kpi(label, valor, d, sub, bom) {
    return '<div class="mx-kpi">' +
      '<p class="mx-kpi-label">' + esc(label) + "</p>" +
      '<div class="mx-kpi-row"><span class="mx-kpi-value">' + valor + "</span>" +
      (d === false ? "" : badge(d, bom)) + "</div>" +
      (sub ? '<p class="mx-kpi-sub">' + sub + "</p>" : "") +
      "</div>";
  }

  // ----------------------------------------------------------------- graficos
  /**
   * Grafico de barras empilhadas por semana.
   * series: [{label, cor, valores:[]}]  cats: rotulos do eixo X
   */
  function stackedBars(cats, series, opts) {
    opts = opts || {};
    var W = 760, H = opts.altura || 260;
    var m = { top: 22, right: 8, bottom: 34, left: 38 };
    var iw = W - m.left - m.right, ih = H - m.top - m.bottom;

    var totais = cats.map(function (_, i) {
      return series.reduce(function (a, s) { return a + (s.valores[i] || 0); }, 0);
    });
    var max = Math.max.apply(null, totais.concat([1]));
    var passo = Math.max(1, Math.ceil(max / 4));
    var topo = passo * 4;

    var bw = Math.min(46, (iw / cats.length) * 0.62);
    var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(opts.aria || "Grafico de barras por semana") + '">'];

    for (var g = 0; g <= 4; g++) {
      var v = (topo / 4) * g, y = m.top + ih - (v / topo) * ih;
      s.push('<line class="mx-grid" x1="' + m.left + '" y1="' + y + '" x2="' + (W - m.right) + '" y2="' + y + '"/>');
      s.push('<text class="mx-axis" x="' + (m.left - 8) + '" y="' + (y + 3.5) + '" text-anchor="end">' + num(v) + "</text>");
    }

    cats.forEach(function (c, i) {
      var cx = m.left + (iw / cats.length) * (i + 0.5);
      var y = m.top + ih;
      var parcial = opts.parciais && opts.parciais[i];
      series.forEach(function (sr) {
        var val = sr.valores[i] || 0;
        if (!val) return;
        var h = (val / topo) * ih;
        y -= h;
        s.push('<rect class="mx-bar' + (parcial ? " mx-partial" : "") + '" x="' + (cx - bw / 2) +
          '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="3" fill="' + sr.cor +
          '"><title>' + esc(sr.label) + ": " + num(val) + " · " + esc(c) + "</title></rect>");
      });
      if (totais[i]) {
        s.push('<text class="mx-barlabel' + (parcial ? " mx-partial" : "") + '" x="' + cx +
          '" y="' + (y - 6) + '" text-anchor="middle">' + num(totais[i]) + "</text>");
      }
      s.push('<text class="mx-axis" x="' + cx + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(c) + "</text>");
    });

    s.push("</svg>");
    var leg = series.map(function (sr) {
      return '<span><i style="background:' + sr.cor + '"></i>' + esc(sr.label) + "</span>";
    }).join("");
    if (opts.parciais && opts.parciais.some(Boolean)) {
      leg += '<span><i style="background:var(--mx-ink-soft);opacity:.45"></i>semana em curso</span>';
    }
    return '<div class="mx-chart">' + s.join("") + '<div class="mx-legend">' + leg + "</div></div>";
  }

  /** Barras simples + linha sobreposta (cadastros x primeiro uso). */
  function barsLine(cats, barras, linha, opts) {
    opts = opts || {};
    var W = 760, H = 260;
    var m = { top: 24, right: 8, bottom: 34, left: 38 };
    var iw = W - m.left - m.right, ih = H - m.top - m.bottom;

    var max = Math.max.apply(null, barras.valores.concat(linha ? linha.valores : []).concat([1]));
    var passo = Math.max(1, Math.ceil(max / 4)), topo = passo * 4;
    var bw = Math.min(48, (iw / cats.length) * 0.5);
    var x = function (i) { return m.left + (iw / cats.length) * (i + 0.5); };
    var y = function (v) { return m.top + ih - (v / topo) * ih; };

    var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(opts.aria || "Cadastros por semana") + '">'];

    for (var g = 0; g <= 4; g++) {
      var v = (topo / 4) * g;
      s.push('<line class="mx-grid" x1="' + m.left + '" y1="' + y(v) + '" x2="' + (W - m.right) + '" y2="' + y(v) + '"/>');
      s.push('<text class="mx-axis" x="' + (m.left - 8) + '" y="' + (y(v) + 3.5) + '" text-anchor="end">' + num(v) + "</text>");
    }

    cats.forEach(function (c, i) {
      var val = barras.valores[i] || 0;
      if (val) {
        s.push('<rect class="mx-bar" x="' + (x(i) - bw / 2) + '" y="' + y(val) + '" width="' + bw +
          '" height="' + (m.top + ih - y(val)) + '" rx="3" fill="' + barras.cor + '"><title>' +
          esc(barras.label) + ": " + num(val) + " · " + esc(c) + "</title></rect>");
        s.push('<text class="mx-barlabel" x="' + x(i) + '" y="' + (y(val) - 7) + '" text-anchor="middle">' + num(val) + "</text>");
      }
      s.push('<text class="mx-axis" x="' + x(i) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(c) + "</text>");
    });

    if (linha) {
      var pts = cats.map(function (_, i) { return x(i) + "," + y(linha.valores[i] || 0); }).join(" ");
      s.push('<polyline points="' + pts + '" fill="none" stroke="' + linha.cor +
        '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
      cats.forEach(function (c, i) {
        s.push('<circle cx="' + x(i) + '" cy="' + y(linha.valores[i] || 0) + '" r="4" fill="#fff" stroke="' +
          linha.cor + '" stroke-width="2.5"><title>' + esc(linha.label) + ": " +
          num(linha.valores[i]) + " · " + esc(c) + "</title></circle>");
      });
    }

    s.push("</svg>");
    var leg = '<span><i style="background:' + barras.cor + '"></i>' + esc(barras.label) + "</span>";
    if (linha) leg += '<span><i style="background:' + linha.cor + '"></i>' + esc(linha.label) + "</span>";
    return '<div class="mx-chart">' + s.join("") + '<div class="mx-legend">' + leg + "</div></div>";
  }

  function funil(titulo, etapas) {
    var base = etapas[0].valor || 1;
    var rows = etapas.map(function (e) {
      var p = (e.valor / base) * 100;
      return '<div class="mx-funnel-row"><span>' + esc(e.label) + "</span>" +
        '<span class="mx-funnel-track"><span class="mx-funnel-fill" style="width:' +
        Math.max(1.5, p).toFixed(1) + '%"></span></span>' +
        '<span class="mx-funnel-num">' + num(e.valor) + " <small>(" + pct(p, 0) + ")</small></span></div>";
    }).join("");
    return '<div class="mx-chart"><p class="mx-eyebrow" style="margin:0 0 14px">' + esc(titulo) +
      '</p><div class="mx-funnel">' + rows + "</div></div>";
  }

  // -------------------------------------------------------- Instagram bridge
  /**
   * Le a contagem de seguidores do data.json do Instagram.
   * O schema do data.json nao esta documentado aqui, entao tentamos os caminhos
   * mais provaveis. Se nenhum bater, retorna null e o card mostra "—".
   * >> Se ficar "—" no dashboard, confira o schema real e ajuste CAMINHOS. <<
   */
  var CAMINHOS = [
    ["followers"], ["followers_count"], ["seguidores"],
    ["profile", "followers"], ["profile", "followers_count"],
    ["account", "followers_count"], ["conta", "seguidores"],
    ["resumo", "followers"], ["summary", "followers"],
    ["overview", "followers"], ["totais", "seguidores"],
    ["meta", "followers_count"]
  ];

  function seguidores(dataJson) {
    if (!dataJson) return null;
    for (var i = 0; i < CAMINHOS.length; i++) {
      var v = dataJson, ok = true;
      for (var j = 0; j < CAMINHOS[i].length; j++) {
        if (v && typeof v === "object" && CAMINHOS[i][j] in v) v = v[CAMINHOS[i][j]];
        else { ok = false; break; }
      }
      if (ok && typeof v === "number" && isFinite(v)) return v;
    }
    // ultimo recurso: qualquer chave que contenha "follow" com valor numerico
    var achado = null;
    (function varre(o, prof) {
      if (achado != null || !o || typeof o !== "object" || prof > 3) return;
      Object.keys(o).forEach(function (k) {
        if (achado != null) return;
        var v = o[k];
        if (typeof v === "number" && isFinite(v) && /follow|seguid/i.test(k)) achado = v;
        else if (v && typeof v === "object") varre(v, prof + 1);
      });
    })(dataJson, 0);
    return achado;
  }

  // ------------------------------------------------------------------ render
  function renderResumo(cad, ati, ig) {
    var ac = cad.acumulado || {};
    var sems = cad.semanas || [];
    var parc = cad.semana_parcial;                 // semana em curso (corte dom-qui)
    var isParc = !!parc;
    var sem = parc || sems.slice(-1)[0] || {};
    var ant = isParc ? (sems.slice(-1)[0] || {}) : (sems.slice(-2)[0] || {});
    // Parcial (dom-qui) nao e comparavel a semana cheia (dom-sab) -> sem badge de variacao
    var sd = function (a, b) { return isParc ? false : delta(a, b); };
    var antTxt = isParc ? "última fechada: " : "semana anterior: ";
    var tAti = ati.totais || {};
    var ref = cad.semana_referencia || {};

    var ativacao = ac.cadastros ? (ac.primeiro_uso / ac.cadastros) * 100 : null;
    var segs = seguidores(ig);

    // --- acumulados, grandes e em destaque
    var hero = heroCard("Cadastros", num(ac.cadastros), "base total desde fev/2026") +
      heroCard("Usuários com 1º uso", num(ac.primeiro_uso),
        ativacao != null ? pct(ativacao) + " de ativação" : "") +
      heroCard("Seguidores no Instagram", num(segs), "@mayaapp.cdc") +
      heroCard("Scans de QR Code", num(tAti.scans_total),
        num(tAti.unicos_total) + " visitantes únicos") +
      heroCard("Assinantes", num(ac.assinantes), "receita acumulada R$ " + num(ac.receita_bruta || 0), true);

    var semanaKpis =
      kpi("Novos cadastros", num(sem.cadastros), sd(sem.cadastros, ant.cadastros),
        antTxt + num(ant.cadastros)) +
      kpi("Usuários com 1º uso", num(sem.primeiro_uso), sd(sem.primeiro_uso, ant.primeiro_uso),
        antTxt + num(ant.primeiro_uso)) +
      kpi("Scans de QR Code", num(tAti.scans_semana), delta(tAti.scans_semana, tAti.scans_semana_anterior),
        "semana anterior: " + num(tAti.scans_semana_anterior)) +
      kpi("Produtos cadastrados", num(sem.produtos_cadastrados),
        sd(sem.produtos_cadastrados, ant.produtos_cadastrados),
        antTxt + num(ant.produtos_cadastrados)) +
      kpi("Imagens geradas", num(sem.imagens_geradas), sd(sem.imagens_geradas, ant.imagens_geradas),
        antTxt + num(ant.imagens_geradas)) +
      kpi("Usuários ativos no mês", num(sem.ativos_mes), false, "acumulado do mês");

    var mes = cad.mes || {}, mant = cad.mes_anterior || {};
    var mesKpis =
      kpi("Cadastros no mês", num(mes.cadastros), delta(mes.cadastros, mant.cadastros),
        esc(mant.label || "mês anterior") + ": " + num(mant.cadastros)) +
      kpi("1º uso no mês", num(mes.primeiro_uso), delta(mes.primeiro_uso, mant.primeiro_uso),
        esc(mant.label || "mês anterior") + ": " + num(mant.primeiro_uso)) +
      kpi("Produtos no mês", num(mes.produtos_cadastrados),
        delta(mes.produtos_cadastrados, mant.produtos_cadastrados),
        esc(mant.label || "mês anterior") + ": " + num(mant.produtos_cadastrados)) +
      kpi("Imagens no mês", num(mes.imagens_geradas), delta(mes.imagens_geradas, mant.imagens_geradas),
        esc(mant.label || "mês anterior") + ": " + num(mant.imagens_geradas));

    mount("mx-resumo", '' +
      '<div class="mx-block"><div class="mx-block-head">' +
        '<h3>Acumulado</h3><span class="mx-stamp">' + esc(ac._periodo || "") + "</span>" +
      '</div><div class="mx-hero">' + hero + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Semana " + periodo(ref.inicio, ref.fim) + "</h3>" +
        '<span class="mx-eyebrow">' + (isParc ? "parcial · dom–qui (corte " + dm(ref.fim) + ")" : "vs. semana anterior") + '</span>' +
      '</div><div class="mx-kpis">' + semanaKpis + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>" + esc(mes.label || "Mês corrente") + "</h3>" +
        '<span class="mx-stamp">recorte ' + esc(mes._periodo || "") + "</span>" +
      '</div><div class="mx-kpis">' + mesKpis + "</div></div>");
  }

  function renderCadastros(cad) {
    var ac = cad.acumulado || {}, mes = cad.mes || {}, mant = cad.mes_anterior || {};
    var sems = cad.semanas || [];
    var parc = cad.semana_parcial, isParc = !!parc;
    var ref = cad.semana_referencia || {};
    var sem = parc || sems.slice(-1)[0] || {};
    var ant = isParc ? (sems.slice(-1)[0] || {}) : (sems.slice(-2)[0] || {});
    var sd = function (a, b) { return isParc ? false : delta(a, b); };
    var semLbl = (isParc ? "parcial · " : "") + (isParc ? periodo(ref.inicio, ref.fim) : periodo(sem.inicio, sem.fim));
    var ativacao = ac.cadastros ? (ac.primeiro_uso / ac.cadastros) * 100 : null;

    var hero = heroCard("Cadastros acumulados", num(ac.cadastros), esc(ac._periodo || "")) +
      heroCard("1º uso acumulado", num(ac.primeiro_uso),
        ativacao != null ? pct(ativacao) + " de ativação" : "") +
      heroCard("Usuários ativos no mês", num(ac.ativos_mes), "acumulado do mês", true) +
      heroCard("Heavy users", num(ac.heavy_users),
        pct(ac.heavy_users_pct, 0) + " da base com 6+ produtos cadastrados", true);

    var grid =
      kpi("Cadastros na semana", num(sem.cadastros), sd(sem.cadastros, ant.cadastros),
        semLbl) +
      kpi("Cadastros no mês", num(mes.cadastros), delta(mes.cadastros, mant.cadastros),
        esc(mant.label || "") + ": " + num(mant.cadastros)) +
      kpi("1º uso na semana", num(sem.primeiro_uso), sd(sem.primeiro_uso, ant.primeiro_uso),
        semLbl) +
      kpi("1º uso no mês", num(mes.primeiro_uso), delta(mes.primeiro_uso, mant.primeiro_uso),
        esc(mant.label || "") + ": " + num(mant.primeiro_uso));

    var cats = sems.map(function (s) { return dm(s.inicio); });
    var chartCad = sems.length >= 2
      ? barsLine(cats,
          { label: "Novos cadastros", cor: "var(--mx-f1)", valores: sems.map(function (s) { return s.cadastros; }) },
          { label: "Usuários com 1º uso", cor: "var(--mx-f3)", valores: sems.map(function (s) { return s.primeiro_uso; }) },
          { aria: "Cadastros e primeiro uso por semana" })
      : '<div class="mx-empty">A série semanal começa com ' + sems.length +
        ' semana registrada. Ela cresce a cada segunda, conforme <code>tools/add_semana.py</code> for rodado.</div>';

    var chartBase = sems.length >= 2
      ? barsLine(cats,
          { label: "Base cadastrada acumulada", cor: "var(--mx-f2)", valores: sems.map(function (s) { return s.base_cadastrada_fim; }) },
          null, { aria: "Base cadastrada acumulada por semana" })
      : "";

    var fProd = funil("Funil de produtos · acumulado", [
      { label: "Cadastrados", valor: ac.produtos_cadastrados },
      { label: "Com sucesso", valor: ac.produtos_sucesso },
      { label: "Salvos", valor: ac.produtos_salvos }
    ]);
    var fImg = funil("Funil de imagens · acumulado", [
      { label: "Geradas", valor: ac.imagens_geradas },
      { label: "Com sucesso", valor: ac.imagens_sucesso },
      { label: "Salvas", valor: ac.imagens_salvas }
    ]);

    var freq = (ac.frequencia || []).map(function (f) {
      var faixa = String(f.faixa || "").replace(/cadastros/i, "produtos cadastrados");
      return "<tr><td>" + esc(faixa) + "</td><td>" + num(f.usuarios) + "</td></tr>";
    }).join("");

    mount("mx-cadastros", '' +
      '<div class="mx-block"><div class="mx-hero">' + hero + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head"><h3>Semana e mês</h3></div>' +
      '<div class="mx-kpis">' + grid + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Cadastros e 1º uso, semana a semana</h3>" +
        '<span class="mx-eyebrow">domingo a sábado</span></div>' + chartCad + "</div>" +

      (chartBase ? '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Evolução da base cadastrada</h3></div>" + chartBase + "</div>" : "") +

      '<div class="mx-block"><div class="mx-block-head"><h3>Conversão de uso</h3></div>' +
      '<div class="mx-kpis" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
        fProd + fImg + "</div>" +
      '<p class="mx-note">A taxa de salvamento é o ponto de perda mais relevante: ' +
        pct(ac.imagens_geradas ? (ac.imagens_salvas / ac.imagens_geradas) * 100 : null) +
        " das imagens geradas são salvas pelo lojista, e " +
        pct(ac.produtos_cadastrados ? (ac.produtos_salvos / ac.produtos_cadastrados) * 100 : null) +
        " dos produtos cadastrados. Cada imagem gerada e não salva é custo de IA sem retorno.</p></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Distribuição por frequência de produtos cadastrados</h3>" +
        '<span class="mx-eyebrow">acumulado</span></div>' +
      '<div class="mx-table-wrap"><table class="mx-table">' +
        "<thead><tr><th>Faixa</th><th>Usuários</th></tr></thead><tbody>" + freq +
        "</tbody></table></div></div>");
  }

  function renderAtivacoes(ati) {
    var t = ati.totais || {}, frentes = ati.frentes || [], sems = ati.semanas || [];
    var ref = ati.semana_referencia || {};
    var cores = ["var(--mx-f1)", "var(--mx-f2)", "var(--mx-f3)", "var(--mx-f4)", "var(--mx-f5)"];

    var hero = heroCard("Scans acumulados", num(t.scans_total), "todas as frentes") +
      heroCard("Visitantes únicos", num(t.unicos_total),
        t.recorrencia ? t.recorrencia.toLocaleString("pt-BR") + " scans por visitante" : "") +
      heroCard("Scans na semana", num(t.scans_semana), periodo(ref.inicio, ref.fim), true) +
      heroCard("Fora da capital", pct(ati.fora_da_capital_pct, 0),
        "dos scans vêm de outras cidades", true);

    var isParcAti = !!ref.parcial; // semana parcial: sem badge de variacao por frente
    var cardsFrente = frentes.map(function (f, i) {
      return kpi(f.label, num(f.scans_semana), isParcAti ? false : delta(f.scans_semana, f.scans_semana_anterior),
        num(f.scans_total) + " scans acumulados · desde " + dm(f.instalacao));
    }).join("");

    // ordem estavel das series para o grafico empilhado
    var labels = frentes.map(function (f) { return f.label; });
    var series = labels.map(function (lb, i) {
      return {
        label: lb,
        cor: cores[i % cores.length],
        valores: sems.map(function (s) { return (s.por_frente || {})[lb] || 0; })
      };
    });
    var chart = stackedBars(
      sems.map(function (s) { return dm(s.inicio); }),
      series,
      {
        aria: "Scans de QR Code por semana e por frente",
        parciais: sems.map(function (s) { return !!s.parcial; })
      }
    );

    var rows = frentes.map(function (f, i) {
      return "<tr><td><span class=\"mx-swatch\" style=\"background:" + cores[i % cores.length] +
        '"></span>' + esc(f.label) + "</td><td>" + esc(f.tipo) + "</td><td>" + dm(f.instalacao) +
        "</td><td>" + num(f.scans_total) + "</td><td>" + num(f.unicos_total) + "</td><td>" +
        num(f.scans_semana) + "</td><td>" + (f.recorrencia != null ? f.recorrencia.toLocaleString("pt-BR") : "—") +
        "</td></tr>";
    }).join("");

    var so = Object.keys(ati.sistema_operacional || {}).map(function (k) {
      return "<tr><td>" + esc(k) + "</td><td>" + num(ati.sistema_operacional[k]) + "</td><td>" +
        pct(t.scans_total ? (ati.sistema_operacional[k] / t.scans_total) * 100 : null, 0) + "</td></tr>";
    }).join("");

    var cid = (ati.top_cidades || []).slice(0, 8).map(function (c) {
      return "<tr><td>" + esc(c.cidade) + "</td><td>" + num(c.scans) + "</td></tr>";
    }).join("");

    mount("mx-ativacoes", '' +
      '<div class="mx-block"><div class="mx-hero">' + hero + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Scans na semana por frente</h3>" +
        '<span class="mx-eyebrow">' + periodo(ref.inicio, ref.fim) + (isParcAti ? " · parcial" : " · vs. semana anterior") + "</span>" +
      '</div><div class="mx-kpis">' + cardsFrente + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>Scans por semana</h3><span class=\"mx-eyebrow\">domingo a sábado</span>" +
      "</div>" + chart + "</div>" +

      '<div class="mx-block"><div class="mx-block-head"><h3>Desempenho por frente</h3></div>' +
      '<div class="mx-table-wrap"><table class="mx-table"><thead><tr>' +
        "<th>Frente</th><th>Tipo</th><th>Desde</th><th>Scans</th><th>Únicos</th>" +
        "<th>Na semana</th><th>Scans/visitante</th></tr></thead><tbody>" + rows +
        '</tbody><tfoot><tr><td>Total</td><td></td><td></td><td>' + num(t.scans_total) +
        "</td><td>" + num(t.unicos_total) + "</td><td>" + num(t.scans_semana) + "</td><td>" +
        (t.recorrencia != null ? t.recorrencia.toLocaleString("pt-BR") : "—") +
        "</td></tr></tfoot></table></div></div>" +

      '<div class="mx-block"><div class="mx-block-head"><h3>Perfil dos scans</h3></div>' +
      '<div class="mx-kpis" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">' +
        '<div class="mx-table-wrap"><table class="mx-table" style="min-width:0">' +
          "<thead><tr><th>Sistema</th><th>Scans</th><th>%</th></tr></thead><tbody>" + so + "</tbody></table></div>" +
        '<div class="mx-table-wrap"><table class="mx-table" style="min-width:0">' +
          "<thead><tr><th>Cidade</th><th>Scans</th></tr></thead><tbody>" + cid + "</tbody></table></div>" +
      "</div></div>");
  }

  // -------------------------------------------------------------- Promotoras
  var PERFIL_LBL = { tradicional: "Tradicional", hibrido: "Híbrido", transicao: "Em transição", focado_digital: "Focado no digital" };
  var SEG_LBL = { moda_feminina: "Moda Feminina", moda_masculina: "Moda Masculina", moda_infantil: "Moda Infantil", unissex_outros: "Unissex / Outros", unissex: "Unissex", acessorios: "Acessórios", moda_praia: "Moda Praia", outros: "Outros" };
  var SINAIS_LBL = { ficou_com_flyer: "Ficou com o flyer p/ baixar depois", responsavel_ausente: "Dona/responsável ausente", barreira_idioma: "Barreira de idioma", celular_sem_espaco: "Celular sem espaço / travou" };
  var FREQ_LBL = { semanal: "Semanal", ocasional: "Ocasional", parou: "Parou de usar" };
  var PAROU_LBL = { falta_de_tempo: "Falta de tempo / não se organizou", nao_gostou_das_fotos: "Não gostou do resultado das fotos", preferiu_como_fazia_antes: "“Preferi continuar como fazia antes”", dificil_ou_demora_processamento: "Achou difícil / demora no processamento" };
  var FIN_LBL = { envio_whatsapp: "Envio por WhatsApp", vendas_redes_sociais: "Vendas nas redes sociais", catalogo: "Catálogo" };
  var BEN_LBL = { fotos_profissionais_descricao: "Fotos profissionais + descrição", atrai_clientes_divulgacao: "Atrai clientes / divulgação", gratuito_pratico_agil: "Gratuito e prático / ágil" };
  var STATUS_LBL = { instalou: "instalou na hora", interesse: "interesse posterior", sem_interesse: "sem interesse", instalou_e_desinstalou: "instalou e desinstalou" };

  function dec1(v) { return v == null ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function pInt(v) { return v == null ? "—" : Math.round(v) + "%"; }
  function ri2(n) { return (n != null && n < 10 ? "0" : "") + n; }

  /** Linhas rótulo→valor (+barra opcional) a partir de um objeto e um mapa de labels. */
  function mrows(obj, labels, withBar, cor) {
    obj = obj || {};
    var keys = Object.keys(labels).filter(function (k) { return obj[k] != null; });
    var max = Math.max.apply(null, keys.map(function (k) { return obj[k]; }).concat([1]));
    return keys.map(function (k) {
      return '<div class="pr-mrow"><span class="mt">' + esc(labels[k]) + '</span>' +
        '<span class="mv pr-num">' + num(obj[k]) + '</span>' +
        (withBar ? '<span class="pr-mtrack"><i style="width:' + (obj[k] / max * 100).toFixed(1) + '%' + (cor ? ';background:' + cor : '') + '"></i></span>' : '') +
        '</div>';
    }).join("");
  }

  function renderPromotoras(P) {
    var rec = P.recorte_semana || {};
    var av = P.ativacao || {};
    var A = av.acumulado || {}, S = av.semana || {};
    var R = P.reativacao || {}, Ra = R.acumulado || {}, Rs = R.semana || {};
    var sin = av.sinais_semana || {};

    var pp = (rec.periodo || "").split(" a ");
    var periodoLbl = pp.length === 2 ? periodo(pp[0], pp[1]) : (rec.periodo || "—");
    var dias = (rec.dias_de_campo || []).map(function (d) {
      return "<b>" + esc(d.dia) + " " + dm(d.data) + "</b> — " + d.promotoras + (d.promotoras === 1 ? " promotora" : " promotoras");
    }).join(" &nbsp;·&nbsp; ");
    var perDia = rec.promotora_dias ? Math.round((S.abordagens || 0) / rec.promotora_dias) : null;
    var convWorse = S.pct_instalacao_imediata != null && A.pct_instalacao_imediata != null && S.pct_instalacao_imediata < A.pct_instalacao_imediata;
    var recWorse = S.receptividade_media != null && A.receptividade_media != null && S.receptividade_media < A.receptividade_media;

    // 1) faixa da semana + insights
    var band =
      '<div class="pr-band"><div class="pr-band-top"><div>' +
        '<div class="lbl">Recorte da semana</div>' +
        '<h3>Semana ' + esc(rec.semana) + ' · ' + esc(periodoLbl) + '</h3>' +
        '<div class="pr-field">Campo: ' + (dias || "— a confirmar") +
          (rec.promotora_dias ? ' &nbsp;·&nbsp; ' + rec.promotora_dias + ' promotora-dias' : '') + '</div>' +
      '</div><div class="pr-pill">' + num(S.abordagens) + ' abordagens na semana</div></div>' +
      '<div class="pr-insights">' +
        '<div class="pr-ic"><div class="k pr-num">' + num(S.abordagens) + '</div><div class="t">abordagens de campo' +
          (rec.promotora_dias ? ' (' + rec.promotora_dias + ' promotora-dias)' : '') + '</div>' +
          (perDia != null ? '<div class="d pr-d-good">≈ ' + perDia + ' por promotora-dia</div>' : '') + '</div>' +
        '<div class="pr-ic"><div class="k pr-num">' + num(S.instalou_na_hora) + '</div><div class="t">instalações na hora</div>' +
          '<div class="d ' + (convWorse ? 'pr-d-crit' : 'pr-d-good') + '">' + pInt(S.pct_instalacao_imediata) + ' imediata (vs. ' + pInt(A.pct_instalacao_imediata) + ' acum.)</div></div>' +
        '<div class="pr-ic"><div class="k pr-num">' + num(S.interesse_posterior) + '</div><div class="t">interesse posterior (ficou com flyer)</div>' +
          '<div class="d pr-d-warn">' + pInt(S.pct_interesse) + ' — follow-up pendente</div></div>' +
        '<div class="pr-ic"><div class="k pr-num">' + dec1(S.receptividade_media) + '</div><div class="t">receptividade média (1–5)</div>' +
          '<div class="d ' + (recWorse ? 'pr-d-crit' : 'pr-d-good') + '">' + (recWorse ? 'abaixo dos ' + dec1(A.receptividade_media) + ' do acum.' : 'acum. ' + dec1(A.receptividade_media)) + '</div></div>' +
      '</div></div>';

    var leitura = '<div class="pr-callout"><b>Leitura da semana:</b> boa cobertura de abordagem (' +
      num(S.abordagens) + (rec.promotora_dias ? ' em ' + rec.promotora_dias + ' promotora-dias' : '') +
      '), mas conversão imediata baixa — ' + num(S.instalou_na_hora) + ' instalaram na hora contra ' +
      num(S.interesse_posterior) + ' que ficaram com o flyer para baixar depois. O gargalo é o <b>follow-up dos ' +
      num(S.interesse_posterior) + ' interessados</b>, não a abordagem' +
      (sin.barreira_idioma ? '. Aparece também <b>barreira de idioma</b> em ' + sin.barreira_idioma + ' casos' : '') + '.</div>';

    // 2) visão geral
    var ovw =
      '<div class="pr-ovw">' +
        '<div class="card"><div class="pr-big"><div class="n pr-num">' + num(A.abordagens) +
          '<small>Abordagens — acumulado</small></div><span class="pr-chip p">+' + num(S.abordagens) + ' na semana</span></div>' +
          '<div class="pr-barline"><i style="width:100%;background:var(--pr-acc)"></i></div></div>' +
        '<div class="card"><div class="pr-big"><div class="n pr-num" style="color:var(--pr-good)">' + num(A.instalou_na_hora) +
          '<small>Cadastros convertidos — instalou na hora (acum.)</small></div><span class="pr-chip g">+' + num(S.instalou_na_hora) + ' na semana</span></div>' +
          '<div class="pr-barline"><i style="width:' + pInt(A.pct_instalacao_imediata) + ';background:var(--pr-good)"></i></div></div>' +
      '</div>';

    // 3) KPIs
    function kpiTile(lab, big, cls, den, wk) {
      return '<div class="card pr-kpi"><div class="lab">' + lab + '</div><div class="v ' + cls + ' pr-num">' + big + '</div>' +
        '<div class="den">' + den + '</div><div class="wk"><span>semana</span><b>' + wk + '</b></div></div>';
    }
    var kpis = '<div class="pr-kpis">' +
      kpiTile("% Instalação imediata", pInt(A.pct_instalacao_imediata), "pr-v-good", num(A.instalou_na_hora) + " de " + num(A.abordagens) + " lojistas", pInt(S.pct_instalacao_imediata) + " · " + num(S.instalou_na_hora) + " de " + num(S.abordagens)) +
      kpiTile("% Demonstrou interesse", pInt(A.pct_interesse), "pr-v-warn", num(A.interesse_posterior) + " com interesse posterior", pInt(S.pct_interesse) + " · " + num(S.interesse_posterior) + " de " + num(S.abordagens)) +
      kpiTile("% Sem interesse", pInt(A.pct_sem_interesse), "pr-v-crit", num(A.sem_interesse) + " recusas registradas", pInt(S.pct_sem_interesse) + " · " + num(S.sem_interesse) + " de " + num(S.abordagens)) +
      kpiTile("Nota de receptividade", dec1(A.receptividade_media) + '<small>/5</small>', "", "média de " + num(A.abordagens) + " abordagens", dec1(S.receptividade_media) + " / 5") +
      '</div>';

    // 4) colunas por semana
    var serie = av.serie_semanal_abordagens || [];
    var maxSerie = Math.max.apply(null, serie.map(function (d) { return d[1]; }).concat([1]));
    var cols = serie.map(function (d, i) {
      var hot = i === serie.length - 1;
      var h = Math.max(2, Math.round(d[1] / maxSerie * 100));
      var lab = hot ? "Sem " + rec.semana : dm(d[0]);
      var showx = i % 3 === 0 || hot;
      return '<div class="pr-col' + (hot ? ' hot' : '') + '"><div class="bar" style="height:' + h + '%" title="' + esc(lab) + ': ' + d[1] + ' abordagens">' +
        '<div class="val">' + (d[1] || "") + '</div></div><div class="xl' + (showx ? '' : ' hide') + '">' + esc(lab) + '</div></div>';
    }).join("");
    var chartBlock = '<div class="card"><div class="mx-block-head"><h3>Abordagens por semana</h3>' +
      '<span class="pr-hint">' + serie.length + ' semanas · semana ' + esc(rec.semana) + ' destacada</span></div>' +
      '<div class="pr-cols">' + cols + '</div></div>';

    // 5) funil + receptividade
    var funMax = Math.max(A.instalou_na_hora || 0, A.interesse_posterior || 0, A.sem_interesse || 0, A.instalou_e_desinstalou || 0, 1);
    function funRow(cls, label, val, pctv) {
      return '<div class="pr-row"><div class="pr-rl"><span class="pr-dot ' + cls + '"></span>' + label + '</div>' +
        '<div class="pr-track"><i class="' + cls + '" style="width:' + ((val || 0) / funMax * 100).toFixed(0) + '%"></i></div>' +
        '<div class="pr-rn pr-num">' + num(val) + (pctv != null ? '<small>' + pInt(pctv) + '</small>' : '') + '</div></div>';
    }
    var funil2 = '<div class="card"><h4 class="pr-h4">Funil de instalação</h4><div class="pr-legend"><span>distribuição dos ' + num(A.abordagens) + ' contatos</span></div>' +
      funRow("pr-bg-good", "Instalou na hora", A.instalou_na_hora, A.pct_instalacao_imediata) +
      funRow("pr-bg-warn", "Interesse posterior", A.interesse_posterior, A.pct_interesse) +
      funRow("pr-bg-crit", "Sem interesse", A.sem_interesse, A.pct_sem_interesse) +
      (A.instalou_e_desinstalou != null ? funRow("pr-bg-neu", "Instalou e desinstalou", A.instalou_e_desinstalou, A.abordagens ? A.instalou_e_desinstalou / A.abordagens * 100 : 0) : "") +
      '<div class="pr-legend" style="margin-top:12px"><span>semana ' + esc(rec.semana) + ' →</span><span>instalou <b>' + num(S.instalou_na_hora) + '</b></span><span>interesse <b>' + num(S.interesse_posterior) + '</b></span><span>sem interesse <b>' + num(S.sem_interesse) + '</b></span></div></div>';

    var dist = A.receptividade_dist || {}, distS = S.receptividade_dist || {};
    var distMax = Math.max.apply(null, [5, 4, 3, 2, 1].map(function (k) { return dist[k] || 0; }).concat([1]));
    var recLabels = { 5: "5 — Muito receptivo", 4: "4 — Receptivo", 3: "3 — Neutro", 2: "2 — Pouco receptivo", 1: "1 — Recusou" };
    var recStyle = { 5: "pr-bg-good", 4: "", 3: "pr-bg-warn", 2: "", 1: "pr-bg-crit" };
    var recInline = { 4: "#5CBF93", 2: "#E0774A" };
    var recRows = [5, 4, 3, 2, 1].map(function (k) {
      var v = dist[k] || 0, cls = recStyle[k], inl = recInline[k];
      return '<div class="pr-row"><div class="pr-rl"><span class="pr-dot ' + cls + '"' + (inl ? ' style="background:' + inl + '"' : '') + '></span>' + recLabels[k] + '</div>' +
        '<div class="pr-track"><i class="' + cls + '" style="width:' + (v / distMax * 100).toFixed(0) + '%' + (inl ? ';background:' + inl : '') + '"></i></div>' +
        '<div class="pr-rn pr-num">' + num(v) + '</div><div class="pr-wkcol">sem: ' + num(distS[k] || 0) + '</div></div>';
    }).join("");
    var recept = '<div class="card"><h4 class="pr-h4">Receptividade (1–5)</h4><div class="pr-legend"><span>acumulado · coluna direita = semana</span></div>' + recRows + '</div>';
    var funBlock = '<div class="pr-tworow">' + funil2 + recept + '</div>';

    // 6) comentários da semana
    var quotes = (av.comentarios_semana || []).map(function (c) {
      var r = c.receptividade, rc = r >= 4 ? "hi" : (r == 3 ? "mid" : "lo");
      return '<div class="pr-q"><p>“' + esc(c.texto) + '”</p><div class="meta">' + esc(c.segmento || "") +
        (c.status ? ' · ' + esc(STATUS_LBL[c.status] || c.status) : "") +
        (r != null ? ' <span class="pr-rec ' + rc + '">rec ' + r + '</span>' : "") + '</div></div>';
    }).join("");
    var comentBlock = '<div class="pr-quotes">' + quotes + '</div>';

    // 7) perfil e feedbacks
    var perfilSemana = av.perfil_semana ? Object.keys(av.perfil_semana).map(function (k) { return (PERFIL_LBL[k] || k) + " " + av.perfil_semana[k]; }).join(" · ") : "";
    var segSemana = av.segmento_semana ? Object.keys(av.segmento_semana).map(function (k) { return (SEG_LBL[k] || k) + " " + av.segmento_semana[k]; }).join(" · ") : "";
    var corredores = (sin.corredores_top || []).join(", ");
    var perfilBlock = '<div class="pr-pgrid">' +
      '<div class="card pr-mini"><div class="mh">Perfil do lojista</div><div class="ms">acumulado</div>' + mrows(av.perfil_acumulado, PERFIL_LBL, true) +
        (perfilSemana ? '<div class="ms" style="margin-top:10px">Semana ' + esc(rec.semana) + ': ' + esc(perfilSemana) + '</div>' : "") + '</div>' +
      '<div class="card pr-mini"><div class="mh">Segmento da loja</div><div class="ms">acumulado</div>' + mrows(av.segmento_acumulado, SEG_LBL, true) +
        (segSemana ? '<div class="ms" style="margin-top:10px">Semana ' + esc(rec.semana) + ': ' + esc(segSemana) + '</div>' : "") + '</div>' +
      '<div class="card pr-mini"><div class="mh">Sinais da semana</div><div class="ms">o que as promotoras registraram</div>' + mrows(sin, SINAIS_LBL, false) +
        ((sin.andar || corredores) ? '<div class="ms" style="margin-top:10px">' + (sin.andar ? 'Abordagens no <b>' + esc(sin.andar) + '</b>' : "") + (corredores ? '; corredores ' + esc(corredores) + ' os mais cobertos' : "") + '.</div>' : "") + '</div>' +
      '</div>';

    // 8) reativação
    var entrevMax = Math.max.apply(null, Object.keys(Ra.frequencia || {}).map(function (k) { return Ra.frequencia[k]; }).concat([1]));
    function freqRow(k) {
      var v = (Ra.frequencia || {})[k]; if (v == null) return "";
      var cls = k === "semanal" ? "pr-bg-good" : (k === "parou" ? "pr-bg-crit" : "pr-bg-warn");
      var pctv = Ra.entrevistados ? Math.round(v / Ra.entrevistados * 100) : null;
      return '<div class="pr-row"><div class="pr-rl"><span class="pr-dot ' + cls + '"></span>' + FREQ_LBL[k] + '</div>' +
        '<div class="pr-track"><i class="' + cls + '" style="width:' + (v / entrevMax * 100).toFixed(0) + '%"></i></div>' +
        '<div class="pr-rn pr-num">' + num(v) + (pctv != null ? '<small>' + pctv + '%</small>' : "") + '</div></div>';
    }
    var indicou = Ra.pct_indicacao != null && Ra.entrevistados ? Math.round(Ra.pct_indicacao / 100 * Ra.entrevistados) : null;
    var reaBlock =
      '<div class="pr-reband"><div><div class="lbl">Reativação · Questionário Heavy Users</div><h3>Como os usuários mais engajados estão hoje</h3></div>' +
        '<div class="lbl">n=' + num(Ra.entrevistados) + ' acum.' + (Rs.entrevistados ? ' · ' + num(Rs.entrevistados) + ' na semana' : "") + '</div></div>' +
      '<div class="pr-rebody"><div class="pr-restat">' +
        '<div class="pr-rs"><div class="rv pr-num">' + num(Ra.entrevistados) + '</div><div class="rl">entrevistados (acumulado)</div>' +
          (Rs.detalhe ? '<div class="rw">+' + num(Rs.entrevistados) + ' nesta semana: ' + esc(Rs.detalhe) + '</div>' : "") + '</div>' +
        '<div class="pr-rs"><div class="rv" style="color:var(--pr-good)">' + dec1(Ra.nota_media_app) + '<small>/5</small></div><div class="rl">nota média do app</div>' +
          (Ra.nota_reativacao != null ? '<div class="rw">reativação (quem parou): ' + dec1(Ra.nota_reativacao) + '/5</div>' : "") + '</div>' +
        '<div class="pr-rs"><div class="rv pr-num">' + pInt(Ra.pct_indicacao) + '</div><div class="rl">já indicou o app a alguém</div>' +
          (indicou != null ? '<div class="rw">' + num(indicou) + ' de ' + num(Ra.entrevistados) + ' entrevistados</div>' : "") + '</div>' +
      '</div><div class="pr-repad"><div class="pr-tworow"><div>' +
        '<h4 class="pr-h4" style="margin-bottom:10px">Frequência de uso</h4>' + freqRow("ocasional") + freqRow("parou") + freqRow("semanal") +
        '<h4 class="pr-h4" style="margin:16px 0 6px">Por que pararam de usar</h4>' + mrows(R.por_que_pararam, PAROU_LBL, false) +
      '</div><div>' +
        '<h4 class="pr-h4" style="margin-bottom:8px">Principais finalidades</h4>' + mrows(R.finalidades, FIN_LBL, true, "var(--pr-info)") +
        '<h4 class="pr-h4" style="margin:14px 0 8px">Principais benefícios</h4>' + mrows(R.beneficios, BEN_LBL, true, "var(--pr-good)") +
      '</div></div>' +
      '<div class="pr-quotes" style="margin-top:16px">' +
        (R.feedback_positivo ? '<div class="pr-q"><span class="pr-tagline" style="background:var(--pr-good-bg);color:var(--pr-good)">feedback positivo</span><p style="margin-top:9px">“' + esc(R.feedback_positivo) + '”</p></div>' : "") +
        (R.feedback_negativo ? '<div class="pr-q"><span class="pr-tagline" style="background:var(--pr-crit-bg);color:var(--pr-crit)">feedback negativo</span><p style="margin-top:9px">“' + esc(R.feedback_negativo) + '”</p></div>' : "") +
      '</div></div></div>';

    // 9) sugestões
    var ranks = (P.sugestoes_funcionalidades || []).map(function (g) {
      return '<div class="pr-rank"><div class="ri">' + ri2(g.rank) + '</div><div class="rt">' + esc(g.tema) +
        (g.exemplos ? '<small>' + esc(g.exemplos) + '</small>' : "") + '</div><div class="rc pr-num">' + num(g.mencoes) + '</div></div>';
    }).join("");
    var sugBlock =
      '<div class="pr-sugband"><div><div class="lbl">Backlog de voz do usuário</div><h3>Sugestões de funcionalidades</h3></div><div class="lbl">menções acumuladas</div></div>' +
      '<div class="pr-sugbody">' + ranks + '</div>';

    var sec = function (title, hint, body) {
      return '<div class="mx-block"><div class="mx-block-head"><h3>' + title + '</h3>' + (hint ? '<span class="pr-hint">' + hint + '</span>' : "") + '</div>' + body + '</div>';
    };

    mount("mx-promotoras",
      '<div class="mx-block">' + band + leitura + '</div>' +
      sec("Visão geral", "acumulado da campanha × semana", ovw) +
      sec("Indicadores da abordagem", "número grande = acumulado · linha = semana", kpis) +
      '<div class="mx-block">' + chartBlock + '</div>' +
      sec("Funil de instalação e receptividade", "barra = acumulado · coluna direita = semana", funBlock) +
      sec("Principais comentários da semana", "qualitativo · semana " + esc(rec.semana), comentBlock) +
      sec("Perfil e feedbacks", "quem foi abordado", perfilBlock) +
      '<div class="mx-block">' + reaBlock + '</div>' +
      '<div class="mx-block">' + sugBlock + '</div>'
    );
  }

  /** Bloco-resumo de Promotoras anexado ao Resumo Executivo (página principal). */
  function renderResumoPromotoras(P) {
    var host = document.getElementById("mx-resumo");
    if (!host) return;
    var av = P.ativacao || {}, A = av.acumulado || {}, S = av.semana || {}, rec = P.recorte_semana || {};
    var lead = "Semana " + esc(rec.semana) + ": " + num(S.abordagens) + " abordagens de campo, " +
      num(S.instalou_na_hora) + " instalações na hora (" + pInt(S.pct_instalacao_imediata) + ") e " +
      num(S.interesse_posterior) + " interessados para follow-up. Acumulado: " + num(A.abordagens) +
      " abordagens / " + num(A.instalou_na_hora) + " instalações (" + pInt(A.pct_instalacao_imediata) + ").";
    var grid =
      kpi("Abordagens na semana", num(S.abordagens), false, "acumulado: " + num(A.abordagens)) +
      kpi("Instalações na hora", num(S.instalou_na_hora), false, pInt(S.pct_instalacao_imediata) + " · acum. " + num(A.instalou_na_hora)) +
      kpi("Interesse posterior", num(S.interesse_posterior), false, pInt(S.pct_interesse) + " da semana") +
      kpi("Receptividade (semana)", dec1(S.receptividade_media), false, "acum. " + dec1(A.receptividade_media) + " / 5");
    host.insertAdjacentHTML("beforeend",
      '<div class="mx-block"><div class="mx-block-head"><h3>Promotoras — ativação de campo</h3>' +
        '<span class="mx-eyebrow">semana ' + esc(rec.semana) + '</span></div>' +
        '<p class="pr-resumo-lead">' + lead + '</p>' +
        '<div class="mx-kpis" style="margin-top:14px">' + grid + '</div></div>');
  }

  // -------------------------------------------------------------------- abas
  function initAbas() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".mx-tab"));
    if (!tabs.length) return;

    function ativa(id, push) {
      tabs.forEach(function (t) {
        var on = t.dataset.tab === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById("mx-panel-" + t.dataset.tab);
        if (p) p.hidden = !on;
      });
      if (push && history.replaceState) history.replaceState(null, "", "#" + id);
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { ativa(t.dataset.tab, true); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus();
        ativa(n.dataset.tab, true);
      });
    });

    var inicial = (location.hash || "").replace("#", "");
    ativa(tabs.some(function (t) { return t.dataset.tab === inicial; }) ? inicial : tabs[0].dataset.tab, false);
  }

  // -------------------------------------------------------------------- boot
  function pega(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(url + " -> HTTP " + r.status);
      return r.json();
    });
  }

  function erro(id, msg) {
    mount(id, '<div class="mx-empty"><strong>Não foi possível carregar os dados.</strong><br>' +
      esc(msg) + "<br>Sirva o dashboard por HTTP (GitHub Pages ou <code>python3 -m http.server</code>).</div>");
  }

  function boot() {
    initAbas();

    var pCad = pega("data/cadastros.json");
    var pAti = pega("data/ativacoes.json");
    var pIg = pega("data.json").catch(function () { return null; }); // Instagram: opcional aqui
    var pProm = pega("data/promotoras.json").catch(function () { return null; }); // Promotoras: opcional

    Promise.all([pCad, pAti, pIg, pProm]).then(function (r) {
      var cad = r[0], ati = r[1], ig = r[2], prom = r[3];
      renderResumo(cad, ati, ig);
      renderCadastros(cad);
      renderAtivacoes(ati);
      if (prom) {
        try { renderPromotoras(prom); renderResumoPromotoras(prom); }
        catch (e2) { console.error("[promotoras]", e2); erro("mx-promotoras", e2.message); }
      } else {
        mount("mx-promotoras", '<div class="mx-empty">Sem dados de promotoras nesta rodada.</div>');
      }

      var st = document.getElementById("mx-atualizado");
      if (st) {
        st.textContent = "Cadastros atualizados em " + dm(cad._atualizado_em) +
          " · QR Codes em " + dm((ati._gerado_em || "").slice(0, 10)) +
          (prom ? " · Promotoras em " + dm(prom.data_corte) : "");
      }
    }).catch(function (e) {
      console.error("[mx-dash]", e);
      ["mx-resumo", "mx-cadastros", "mx-ativacoes"].forEach(function (id) {
        erro(id, e.message);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
