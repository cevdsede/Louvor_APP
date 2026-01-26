/****************************************************
 * CONFIGURAÇÃO CENTRAL LOUVOR CEVD
 ****************************************************/
const SPREADSHEET_ID = "1YlDdN1LzGLc40WwJr-5Tt1-Hp_sujKZBvHct4jvRubA";
const PASTA_FOTOS_ID = "1szc3tN-1nubNXk0Hl0LtGKb2V71G-NKE";

/**
 * doPost: Processa Login e Salvamento de Dados
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // --- AÇÃO: LOGIN ---
    if (params.action === "login") {
      const sheet = ss.getSheetByName("Acesso");
      if (!sheet) return errorResponse("Aba 'Acesso' não encontrada");
      
      const data = sheet.getDataRange().getValues();
      const u = String(params.user).toLowerCase().trim();
      const p = String(params.pass).trim();
      
      for (let i = 1; i < data.length; i++) {
        const userSheet = String(data[i][1]).toLowerCase().trim();
        const passSheet = String(data[i][2]).trim();
        
        if (userSheet === u && passSheet === p) {
          return jsonResponse({
            status: "success",
            user: { Nome: data[i][0], User: data[i][1], Role: data[i][3] }
          });
        }
      }
      return errorResponse("Usuário ou senha incorretos");
    }

    // --- AÇÃO: SALVAR REPERTÓRIO ---
    if (params.sheet === "Repertório_PWA") {
      const sheet = ss.getSheetByName("Repertório_PWA");
      if (!sheet) return errorResponse("Aba 'Repertório_PWA' não encontrada");
      const r = params.data || params;
      sheet.appendRow([r.Músicas, r.Cantor, r.Tons, r.Culto, r.Data, r.Ministro]);
      return successResponse("Repertório salvo com sucesso");
    }
    
    // --- AÇÃO: EXCLUIR GENÉRICO ---
    if (params.action === "delete" && params.sheet) {
      const sheet = ss.getSheetByName(params.sheet);
      if (!sheet) return errorResponse("Aba não encontrada");
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf(params.sheet === "Lembretes" ? "id_Lembrete" : "ID");
      
      if (idCol === -1) return errorResponse("Coluna ID não encontrada");
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(params.id_Lembrete || params.id)) {
          sheet.deleteRow(i + 1);
          return successResponse("Item excluído");
        }
      }
    }

    return errorResponse("Ação não reconhecida.");

  } catch (err) {
    return errorResponse("Erro no Servidor: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * doGet: Processa Busca de Dados e Imagens
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // --- ROTA: IMAGENS DO DRIVE ---
    if (e.parameter.action === "getImages") {
       const fotos = buscarImagensDoDrive();
       return jsonResponse({ status: "success", data: fotos }); 
    }

    // --- ROTA: DADOS DAS ABAS (COM SUPORTE A LINKS/RICH TEXT) ---
    const sheetName = e.parameter.sheet;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return errorResponse("Aba '" + sheetName + "' não existe.");
    
    const range = sheet.getDataRange();
    const data = range.getValues();
    const richText = range.getRichTextValues(); // Captura links (WhatsApp, etc)
    
    if (data.length < 2) return jsonResponse({ status: "success", data: [] });

    const headers = data.shift();
    richText.shift();

    const rows = data
      .filter(r => r.some(cell => cell !== "")) // Remove linhas vazias
      .map((r, rIndex) => {
        let obj = {};
        headers.forEach((h, cIndex) => {
          const cellValue = r[cIndex];
          const rich = richText[rIndex][cIndex];
          // Se houver um link na célula, envia como objeto {texto, link}
          if (rich && rich.getLinkUrl()) {
            obj[h] = { texto: cellValue, link: rich.getLinkUrl() };
          } else {
            obj[h] = cellValue;
          }
        });
        return obj;
      });

    return jsonResponse({ status: "success", data: rows });

  } catch(err) {
    return errorResponse(err.toString());
  }
}

/**
 * Função Auxiliar: Busca arquivos na pasta do Google Drive
 */
function buscarImagensDoDrive() {
  try {
    const folder = DriveApp.getFolderById(PASTA_FOTOS_ID);
    const files = folder.getFiles();
    const lista = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const nome = file.getName();
      if (nome.toLowerCase().endsWith(".png") || nome.toLowerCase().endsWith(".jpg") || nome.toLowerCase().endsWith(".jpeg")) {
        lista.push({
          id: file.getId(),
          nome: nome,
          url: "https://lh3.googleusercontent.com/u/0/d/" + file.getId()
        });
      }
    }
    return lista;
  } catch (e) {
    console.error("Erro no Drive: " + e.message);
    return [];
  }
}

// Helpers de Resposta
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function errorResponse(m) { return jsonResponse({ status: "error", message: m }); }
function successResponse(m) { return jsonResponse({ status: "success", message: m }); }