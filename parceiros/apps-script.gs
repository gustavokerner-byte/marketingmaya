/**
 * MayaApp — Programa de Parceiros
 * Recebe as inscrições da landing (parceiros/index.html) e grava numa planilha.
 *
 * Instalação: ver parceiros/SETUP-PLANILHA.md
 */

// Aba onde os leads são gravados (criada automaticamente se não existir)
const ABA = 'Inscrições';

const COLUNAS = [
  'Data/Hora', 'Nome', 'WhatsApp', 'Cidade/UF', 'E-mail',
  'Já vende para lojistas', 'Forma de atuação', 'MEI/PJ', 'Origem'
];

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const sheet = getSheet_();

    sheet.appendRow([
      new Date(),
      d.nome || '',
      d.whatsapp || '',
      d.cidade || '',
      d.email || '',
      d.perfil || '',
      d.modelo || '',
      d.pj || '',
      d.origem || 'landing-parceiros'
    ]);

    // Avisa a equipe por e-mail a cada nova inscrição (opcional):
    // remova as barras da linha abaixo e troque o endereço.
    // MailApp.sendEmail('parceiros@mayaapp.com.br',
    //   'Nova inscrição de parceiro: ' + (d.nome || ''),
    //   COLUNAS.slice(1).map((c, i) => c + ': ' + [d.nome, d.whatsapp, d.cidade,
    //     d.email, d.perfil, d.modelo, d.pj, d.origem][i]).join('\n'));

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, servico: 'MayaApp — inscrições de parceiros' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ABA);
  if (!sheet) {
    sheet = ss.insertSheet(ABA);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUNAS);
    sheet.getRange(1, 1, 1, COLUNAS.length)
      .setFontWeight('bold')
      .setBackground('#1A0A2E')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
