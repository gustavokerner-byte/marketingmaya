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
    var sem = (cad.semanas || []).slice(-1)[0] || {};
    var ant = (cad.semanas || []).slice(-2)[0] || {};
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
      kpi("Novos cadastros", num(sem.cadastros), delta(sem.cadastros, ant.cadastros),
        "semana anterior: " + num(ant.cadastros)) +
      kpi("Usuários com 1º uso", num(sem.primeiro_uso), delta(sem.primeiro_uso, ant.primeiro_uso),
        "semana anterior: " + num(ant.primeiro_uso)) +
      kpi("Scans de QR Code", num(tAti.scans_semana), delta(tAti.scans_semana, tAti.scans_semana_anterior),
        "semana anterior: " + num(tAti.scans_semana_anterior)) +
      kpi("Produtos cadastrados", num(sem.produtos_cadastrados),
        delta(sem.produtos_cadastrados, ant.produtos_cadastrados),
        "semana anterior: " + num(ant.produtos_cadastrados)) +
      kpi("Imagens geradas", num(sem.imagens_geradas), delta(sem.imagens_geradas, ant.imagens_geradas),
        "semana anterior: " + num(ant.imagens_geradas)) +
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
        '<span class="mx-eyebrow">vs. semana anterior</span>' +
      '</div><div class="mx-kpis">' + semanaKpis + "</div></div>" +

      '<div class="mx-block"><div class="mx-block-head">' +
        "<h3>" + esc(mes.label || "Mês corrente") + "</h3>" +
        '<span class="mx-stamp">recorte ' + esc(mes._periodo || "") + "</span>" +
      '</div><div class="mx-kpis">' + mesKpis + "</div></div>");
  }

  function renderCadastros(cad) {
    var ac = cad.acumulado || {}, mes = cad.mes || {}, mant = cad.mes_anterior || {};
    var sems = cad.semanas || [];
    var sem = sems.slice(-1)[0] || {}, ant = sems.slice(-2)[0] || {};
    var ativacao = ac.cadastros ? (ac.primeiro_uso / ac.cadastros) * 100 : null;

    var hero = heroCard("Cadastros acumulados", num(ac.cadastros), esc(ac._periodo || "")) +
      heroCard("1º uso acumulado", num(ac.primeiro_uso),
        ativacao != null ? pct(ativacao) + " de ativação" : "") +
      heroCard("Usuários ativos no mês", num(ac.ativos_mes), "acumulado do mês", true) +
      heroCard("Heavy users", num(ac.heavy_users),
        pct(ac.heavy_users_pct, 0) + " da base com 6+ cadastros", true);

    var grid =
      kpi("Cadastros na semana", num(sem.cadastros), delta(sem.cadastros, ant.cadastros),
        periodo(sem.inicio, sem.fim)) +
      kpi("Cadastros no mês", num(mes.cadastros), delta(mes.cadastros, mant.cadastros),
        esc(mant.label || "") + ": " + num(mant.cadastros)) +
      kpi("1º uso na semana", num(sem.primeiro_uso), delta(sem.primeiro_uso, ant.primeiro_uso),
        periodo(sem.inicio, sem.fim)) +
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
      return "<tr><td>" + esc(f.faixa) + "</td><td>" + num(f.usuarios) + "</td></tr>";
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
        "<h3>Distribuição por frequência de cadastro</h3>" +
        '<span class="mx-eyebrow">acumulado</span></div>' +
      '<div class="mx-table-wrap"><table class="mx-table">' +
        "<thead><tr><th>Faixa</th><th>Usuários</th></tr></thead><tbody>" + freq +
        "</tbody></table></div></div>");
  }

  function renderAtivacoes(ati) {
    var t = ati.totais || {}, frentes = ati.frentes || [], sems = ati.semanas || [];
    var ref = ati.semana_referencia || {};
    var cores = ["var(--mx-f1)", "var(--mx-f2)", "var(--mx-f3)", "var(--mx-f4)"];

    var hero = heroCard("Scans acumulados", num(t.scans_total), "todas as frentes") +
      heroCard("Visitantes únicos", num(t.unicos_total),
        t.recorrencia ? t.recorrencia.toLocaleString("pt-BR") + " scans por visitante" : "") +
      heroCard("Scans na semana", num(t.scans_semana), periodo(ref.inicio, ref.fim), true) +
      heroCard("Fora da capital", pct(ati.fora_da_capital_pct, 0),
        "dos scans vêm de outras cidades", true);

    var cardsFrente = frentes.map(function (f, i) {
      return kpi(f.label, num(f.scans_semana), delta(f.scans_semana, f.scans_semana_anterior),
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
        '<span class="mx-eyebrow">' + periodo(ref.inicio, ref.fim) + " · vs. semana anterior</span>" +
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

    Promise.all([pCad, pAti, pIg]).then(function (r) {
      var cad = r[0], ati = r[1], ig = r[2];
      renderResumo(cad, ati, ig);
      renderCadastros(cad);
      renderAtivacoes(ati);

      var st = document.getElementById("mx-atualizado");
      if (st) {
        st.textContent = "Cadastros atualizados em " + dm(cad._atualizado_em) +
          " · QR Codes em " + dm((ati._gerado_em || "").slice(0, 10));
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
