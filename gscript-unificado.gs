/****************************************************
 * LOUVOR CEVD - SCRIPT UNIFICADO
 * Combina funcionalidades de gscript-inserir.gs + gscript-json.gs
 * 
 * Funcionalidades:
 * - Login e autenticação
 * - CRUD completo (criar, ler, atualizar, excluir)
 * - Validação de duplicatas
 * - Rich text e links (WhatsApp, etc)
 * - Busca de imagens do Google Drive
 * - Tratamento robusto de erros
 ****************************************************/

const CONFIG = {
  SPREADSHEET_ID: "1YlDdN1LzGLc40WwJr-5Tt1-Hp_sujKZBvHct4jvRubA",
  PASTA_FOTOS_ID: "1szc3tN-1nubNXk0Hl0LtGKb2V71G-NKE"
};

/**
 * doGet: Processa buscas de dados, imagens e rich text
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // --- ROTA: IMAGENS DO DRIVE ---
    if (e.parameter.action === "getImages") {
       const fotos = buscarImagensDoDrive();
       return jsonResponse({ status: "success", data: fotos }); 
    }

    // --- ROTA: DADOS DAS ABAS (COM SUPORTE A LINKS/RICH TEXT) ---
    const sheetName = e.parameter.sheet;
    if (!sheetName) return errorResponse("Parâmetro 'sheet' não informado");
    
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
    return errorResponse("Erro em doGet: " + err.toString());
  }
}

/**
 * doPost: Processa login, salvamento, exclusão e validações
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 
  
  try {
    // Tratar parâmetros de GET ou POST
    let params;
    if (e.postData && e.postData.contents) {
      // POST - JSON
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // GET - Parâmetros da URL
      params = e.parameter;
      
      // Para GET, converter parâmetros de dados se existirem
      if (params.data) {
        try {
          params.data = JSON.parse(params.data);
        } catch (err) {
          // Se não for JSON, manter como está
        }
      }
    } else {
      return errorResponse("Nenhum parâmetro recebido");
    }
    
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

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

    // --- AÇÃO: ADICIONAR AO HISTÓRICO ---
    if (params.action === "addHistory") {
      const sheet = ss.getSheetByName("Historico de Músicas");
      if (!sheet) return errorResponse("Aba 'Historico de Músicas' não encontrada");
      
      const dados = sheet.getDataRange().getValues();
      
      if (params.data && Array.isArray(params.data)) {
        // Bulk add - validação de duplicatas em lote
        const novasLinhas = [];
        let duplicatas = 0;
        
        for (const item of params.data) {
          const musicaCantor = String(item.musicaCantor || "").trim();
          if (!musicaCantor) continue;
          
          const duplicata = dados.some((row, index) => {
            if (index === 0) return false;
            return String(row[1]).trim() === musicaCantor; // Coluna B = "Musica - Cantor"
          });
          
          if (!duplicata) {
            novasLinhas.push([
              item.ministro || "Líder não definido",
              musicaCantor,
              item.tom || "--"
            ]);
          } else {
            duplicatas++;
          }
        }
        
        // Adicionar todas as novas linhas de uma vez
        if (novasLinhas.length > 0) {
          sheet.getRange(sheet.getLastRow() + 1, 1, novasLinhas.length, 3).setValues(novasLinhas);
        }
        
        const msg = duplicatas > 0 
          ? `${novasLinhas.length} músicas adicionadas. ${duplicatas} duplicatas ignoradas.`
          : `${novasLinhas.length} músicas adicionadas com sucesso!`;
        
        return jsonResponse({ status: "success", message: msg });
      } else {
        // Single add
        const musicaCantor = String(params.musicaCantor || "").trim();
        if (!musicaCantor) return errorResponse("Campo 'musicaCantor' é obrigatório");
        
        const duplicata = dados.some((row, index) => {
          if (index === 0) return false;
          return String(row[1]).trim() === musicaCantor;
        });
        
        if (duplicata) {
          return jsonResponse({ status: "warning", message: "⚠️ Esta música já está no histórico!" });
        }
        
        sheet.appendRow([
          params.ministro || "Líder não definido",
          musicaCantor,
          params.tom || "--"
        ]);
        
        return jsonResponse({ status: "success", message: "✅ Música adicionada ao histórico!" });
      }
    }

    // --- AÇÃO: REPERTÓRIO (COM VALIDAÇÃO DE DUPLICATAS) ---
    if ((params.sheet === "Repertório_PWA" || params.sheet === "Repertorio_PWA") && 
        (params.action === "addRow" || !params.action)) {
      
      // LOG DE DEBUG
      console.log("=== REPERTÓRIO DEBUG ===");
      console.log("params completos: " + JSON.stringify(params));
      console.log("action: " + params.action);
      console.log("sheet: " + params.sheet);
      
      const sheet = ss.getSheetByName("Repertório_PWA");
      if (!sheet) return errorResponse("Aba 'Repertório_PWA' não encontrada");
      
      const dados = sheet.getDataRange().getValues();
      const r = params.data || params;
      
      // LOG DE DEBUG
      console.log("dados recebidos: " + JSON.stringify(r));
      
      // Verificar duplicata pelos campos: Músicas, Cantor, Culto, Data
      const rowMusica = String(r.Músicas || "").trim();
      const rowCantor = String(r.Cantor || "").trim();
      const rowCulto = String(r.Culto || "").trim();
      const rowData = String(r.Data || "").trim();
      
      // LOG DE DEBUG
      console.log("valores para comparação:");
      console.log("Música: '" + rowMusica + "'");
      console.log("Cantor: '" + rowCantor + "'");
      console.log("Culto: '" + rowCulto + "'");
      console.log("Data: '" + rowData + "'");
      
      // Se não tiver música ou cantor, não valida duplicata
      if (!rowMusica || !rowCantor) {
        console.log("ERRO: Campos obrigatórios faltando");
        return errorResponse("Campos 'Músicas' e 'Cantor' são obrigatórios");
      }
      
      const duplicata = dados.some((row, index) => {
        if (index === 0) return false;
        const match = String(row[0]).trim() === rowMusica && 
                     String(row[1]).trim() === rowCantor && 
                     String(row[3]).trim() === rowCulto && 
                     String(row[4]).trim() === rowData;
        
        if (match) {
          console.log("DUPLICATA ENCONTRADA na linha " + (index + 1) + ":");
          console.log("Existente: '" + String(row[0]).trim() + "' | '" + String(row[1]).trim() + "' | '" + String(row[3]).trim() + "' | '" + String(row[4]).trim() + "'");
        }
        
        return match;
      });
      
      console.log("Resultado da validação: " + (duplicata ? "DUPLICATA" : "NOVO"));
      
      if (duplicata) {
        return jsonResponse({ status: "warning", message: `⚠️ Esta música já está no repertório para este culto!` });
      }
      
      sheet.appendRow([r.Músicas, r.Cantor, r.Tons, r.Culto, r.Data, r.Ministro]);
      console.log("Música adicionada com sucesso!");
      return jsonResponse({ status: "success", message: "✅ Música cadastrada no repertório!" });
    }

    // --- AÇÃO: EXCLUSÃO GENÉRICA ---
    if (params.action === "delete" && params.sheet) {
      const sheet = ss.getSheetByName(params.sheet);
      if (!sheet) return errorResponse("Aba não encontrada");
      
      // Para Repertório_PWA, usar exclusão por combinação de campos
      if (params.sheet === "Repertório_PWA" || params.sheet === "Repertorio_PWA") {
        const dados = sheet.getDataRange().getValues();
        let encontrou = false;
        
        for (let i = 1; i < dados.length; i++) {
          const rowMusica = String(dados[i][0]).trim();
          const rowCulto = String(dados[i][3]).trim();
          const rowData = String(dados[i][4]).trim();
          
          const musica = String(params.Músicas || "").trim();
          const culto = String(params.Culto || "").trim();
          const data = String(params.Data || "").trim();
          
          if (rowMusica === musica && rowCulto === culto && rowData === data) {
            sheet.deleteRow(i + 1);
            encontrou = true;
            break;
          }
        }
        
        if (encontrou) {
          return jsonResponse({ status: "success", message: "✅ Música excluída do repertório!" });
        } else {
          return errorResponse("Música não encontrada para excluir");
        }
      }
      
      // Para outras abas, usar exclusão por ID
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf(params.sheet === "Lembretes" ? "id_Lembrete" : "ID");
      
      if (idCol === -1) return errorResponse("Coluna ID não encontrada");
      
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(params.id_Lembrete || params.id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "✅ Item excluído com sucesso!" });
        }
      }
      
      return errorResponse("Item não encontrado para excluir");
    }

    // --- AÇÃO: EXCLUSÃO DE EVENTO EM LOTE ---
    if (params.action === "deleteEvent") {
      const idAula = String(params.ID_AULA).trim();
      
      const limparAba = (nomeAba) => {
        const sheet = ss.getSheetByName(nomeAba);
        if (!sheet) return;
        const range = sheet.getDataRange();
        const rows = range.getValues();
        const headers = rows[0];
        const colIdx = headers.indexOf("ID_AULA");
        if (colIdx === -1) return;

        // Filtra comparando como String e sem espaços
        const filtered = rows.filter((row, idx) => {
          return idx === 0 || String(row[colIdx]).trim() !== idAula;
        });

        if (filtered.length < rows.length) {
          sheet.clear();
          sheet.getRange(1, 1, filtered.length, filtered[0].length).setValues(filtered);
        }
      };

      // Limpar de múltiplas abas
      limparAba("Chamada");
      limparAba("Consagração");
      
      return jsonResponse({ status: "success", message: "✅ Evento excluído de todas as abas!" });
    }

    // --- AÇÃO: SALVAR PRESENÇA ---
    if (params.action === "saveAttendance") {
      const sheet = ss.getSheetByName("Chamada");
      if (!sheet) return errorResponse("Aba 'Chamada' não encontrada");
      
      const idAula = params.ID_AULA;
      const presencas = params.data || [];
      
      // Obter dados existentes
      const dadosExistentes = sheet.getDataRange().getValues();
      const headers = dadosExistentes[0];
      const idAulaCol = headers.indexOf("ID_AULA");
      const nomeCol = headers.indexOf("NOME");
      const presencaCol = headers.indexOf("PRESENÇA");
      const justificativaCol = headers.indexOf("JUSTIFICATIVA");
      
      // Atualizar presenças existentes e adicionar novas
      presencas.forEach(presenca => {
        const nome = presenca.NOME;
        const status = presenca.PRESENÇA;
        const componentes = presenca.COMPONENTES || "";
        
        // Procurar linha existente
        let linhaExistente = -1;
        for (let i = 1; i < dadosExistentes.length; i++) {
          if (String(dadosExistentes[i][nomeCol]) === nome && 
              String(dadosExistentes[i][idAulaCol]) === idAula) {
            linhaExistente = i;
            break;
          }
        }
        
        if (linhaExistente > 0) {
          // Atualizar linha existente
          sheet.getRange(linhaExistente + 1, presencaCol + 1).setValue(status);
          if (componentes) {
            sheet.getRange(linhaExistente + 1, justificativaCol + 1).setValue(componentes);
          }
        } else {
          // Adicionar nova linha
          const novaLinha = [
            idAula,
            nome,
            status,
            componentes
          ];
          sheet.appendRow(novaLinha);
        }
      });
      
      return jsonResponse({ status: "success", message: "✅ Presença salva com sucesso!" });
    }

    // --- AÇÃO: ADICIONAR CONSAGRAÇÃO ---
    if (params.sheet === "Consagração" && !params.action) {
      const sheet = ss.getSheetByName("Consagração");
      if (!sheet) return errorResponse("Aba 'Consagração' não encontrada");
      
      const r = params.data || params;
      
      // Converter data para formato dd/mm/yyyy se necessário
      let dataFormatada = r.DATA || "";
      if (dataFormatada) {
        // Se estiver no formato yyyy-mm-dd, converter para dd/mm/yyyy
        if (dataFormatada.includes('-') && dataFormatada.split('-')[0].length === 4) {
          const [ano, mes, dia] = dataFormatada.split('-');
          dataFormatada = `${dia}/${mes}/${ano}`;
        }
      }
      
      // Mapeamento específico para Consagração
      const row = [
        dataFormatada || "",
        r.TEMA || "",
        r.ID_AULA || "",
        r.STATUS || ""
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ status: "success", message: "✅ Consagração registrada com sucesso!" });
    }

    // --- AÇÃO: ADICIONAR MÚSICAS ---
    if (params.sheet === "Musicas" && !params.action) {
      const sheet = ss.getSheetByName("Musicas");
      if (!sheet) return errorResponse("Aba 'Musicas' não encontrada");
      
      const r = params.data || params;
      
      // Gerar fórmulas de links automáticos
      const musica = r.Musica || "";
      const cantor = r.Cantor || "";
      
      // Mapeamento específico para Musicas com fórmulas de links
      const row = [
        r.Tema || "",
        r.Estilo || "",
        musica,
        cantor,
        `=HYPERLINK(CONCATENATE("https://music.youtube.com/search?q="; SUBSTITUTE(C${sheet.getLastRow() + 1};" ";" + ");"+";SUBSTITUTE(D${sheet.getLastRow() + 1};" ";" + "));"Youtube Music")`,
        `=HYPERLINK(CONCATENATE("https://open.spotify.com/search/"; SUBSTITUTE(C${sheet.getLastRow() + 1};" ";"%20");"%20";SUBSTITUTE(D${sheet.getLastRow() + 1};" ";"%20"));"Spotify")`,
        `=HYPERLINK(CONCATENATE("https://www.letras.mus.br/?q="; SUBSTITUTE(C${sheet.getLastRow() + 1};" ";"%20");"%20";SUBSTITUTE(D${sheet.getLastRow() + 1};" ";"%20"));"Letra")`,
        `=HYPERLINK(CONCATENATE("https://www.cifraclub.com.br/?q="; SUBSTITUTE(C${sheet.getLastRow() + 1};" ";" + ");"+";SUBSTITUTE(D${sheet.getLastRow() + 1};" ";" + "));"Cifra")`
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ status: "success", message: "✅ Música cadastrada com links automáticos!" });
    }

    // --- AÇÃO: SALVAR GENÉRICO ---
    if (params.sheet && !params.action) {
      const sheet = ss.getSheetByName(params.sheet);
      if (!sheet) return errorResponse("Aba não encontrada");
      
      const r = params.data || params;
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const row = headers.map(header => r[header] || "");
      
      sheet.appendRow(row);
      return jsonResponse({ status: "success", message: "✅ Dados salvos com sucesso!" });
    }

    return errorResponse("Ação não reconhecida.");

  } catch (err) {
    return errorResponse("Erro no Servidor: " + err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * Função Auxiliar: Busca arquivos de imagem na pasta do Google Drive
 */
function buscarImagensDoDrive() {
  try {
    const folder = DriveApp.getFolderById(CONFIG.PASTA_FOTOS_ID);
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

// --- HELPERS DE RESPOSTA ---
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(m) { 
  return jsonResponse({ status: "error", message: m }); 
}

function successResponse(m) { 
  return jsonResponse({ status: "success", message: m }); 
}
