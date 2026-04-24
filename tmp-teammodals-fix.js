const fs = require('fs');
const path = 'C:/Apps/Louvor/components/equipe/TeamModals.tsx';
let content = fs.readFileSync(path, 'utf8');

const replaceAll = (from, to) => {
  if (content.includes(from)) content = content.split(from).join(to);
};

replaceAll("showError('NÃ£o foi possÃ­vel carregar os detalhes da escala.');", "showError('Não foi possível carregar os detalhes da escala.');");
replaceAll("// FunÃƒÂ§ÃƒÂ£o para abrir WhatsApp com o membro", "// Função para abrir WhatsApp com o membro");
replaceAll("const message = encodeURIComponent(`OlÃƒÂ¡ ${member.name}! Tudo bem?`);", "const message = encodeURIComponent(`Olá ${member.name}! Tudo bem?`);");
replaceAll("// FunÃƒÂ§ÃƒÂ£o para editar membro", "// Função para editar membro");
replaceAll("// Fecha o modal atual e abre o modal de ediÃƒÂ§ÃƒÂ£o", "// Fecha o modal atual e abre o modal de edição");
replaceAll("// FunÃƒÂ§ÃƒÂ£o para fazer upload da foto", "// Função para fazer upload da foto");
replaceAll("showError('Por favor, selecione um arquivo de imagem vÃƒÂ¡lido.');", "showError('Por favor, selecione um arquivo de imagem válido.');");
replaceAll("// Validar tamanho (mÃƒÂ¡ximo 5MB)", "// Validar tamanho (máximo 5MB)");
replaceAll("showError('A imagem deve ter no mÃƒÂ¡ximo 5MB.');", "showError('A imagem deve ter no máximo 5MB.');");
replaceAll("logger.warn('NÃƒÂ£o foi possÃƒÂ­vel apagar a foto antiga:', deleteError, 'ui');", "logger.warn('Não foi possível apagar a foto antiga:', deleteError, 'ui');");
replaceAll("// Obter URL pÃƒÂºblica", "// Obter URL pública");
replaceAll("// FunÃƒÂ§ÃƒÂ£o para salvar ediÃƒÂ§ÃƒÂ£o do membro", "// Função para salvar edição do membro");
replaceAll("console.warn('Aviso: NÃƒÂ£o foi possÃƒÂ­vel atualizar o email na tabela auth.users:', authError.message);", "console.warn('Aviso: Não foi possível atualizar o email na tabela auth.users:', authError.message);");
replaceAll("// NÃƒÂ£o falhar a operaÃƒÂ§ÃƒÂ£o principal, apenas avisar", "// Não falhar a operação principal, apenas avisar");
replaceAll("// Fecha o modal de ediÃƒÂ§ÃƒÂ£o", "// Fecha o modal de edição");
replaceAll("// Buscar avisos gerais do membro quando o modal ÃƒÂ© aberto", "// Buscar avisos gerais do membro quando o modal é aberto");
replaceAll("// NÃƒÂ£o mostrar erro para o usuÃƒÂ¡rio, apenas log", "// Não mostrar erro para o usuário, apenas log");
replaceAll("{/* Modal de Membro - Centralizado apenas na ÃƒÂ¡rea de conteÃƒÂºdo (ignorando navbar) */}", "{/* Modal de Membro - Centralizado apenas na área de conteúdo (ignorando navbar) */}");
replaceAll("{/* PrÃƒÂ³ximas Escalas */}", "{/* Próximas Escalas */}");
replaceAll(">PrÃƒÂ³ximas Escalas<", ">Próximas Escalas<");
replaceAll("Ã¢â‚¬Â¢", "•");
replaceAll("{/* RepertÃƒÂ³rio Recente - Apenas para Ministro ou Vocal */}", "{/* Repertório Recente - Apenas para Ministro ou Vocal */}");
replaceAll(">RepertÃƒÂ³rio Recente<", ">Repertório Recente<");
replaceAll("Nenhuma mÃƒÂºsica registrada", "Nenhuma música registrada");
replaceAll("{/* Modal de EdiÃ§Ã£o de Membro */}", "{/* Modal de Edição de Membro */}");
replaceAll("{/* FormulÃ¡rio de EdiÃ§Ã£o Simplificado */}", "{/* Formulário de Edição Simplificado */}");
replaceAll(">RepertÃ³rio<", ">Repertório<");
replaceAll("Nenhuma mÃºsica no repertÃ³rio", "Nenhuma música no repertório");
replaceAll("musica: song?.musica || 'Sem mÃºsica'", "musica: song?.musica || 'Sem música'");
replaceAll("key: tone?.nome_tons || 'Ã‘'", "key: tone?.nome_tons || 'N/D'");
replaceAll("{/* SeÃ§Ã£o Perfil */}", "{/* Seção Perfil */}");
replaceAll("const openScaleDetail = (eventId: string) => {\r\n    // Mock function - implementar lÃƒÂ³gica real\r\n    console.log('Opening scale detail for:', eventId);\r\n  };\r\n", "");
if (!content.includes("import EventCard from '../escalas/EventCard';")) {
  replaceAll("import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';", "import { sortMembersByRole, getRoleIcon } from '../../utils/teamUtils';\r\nimport EventCard from '../escalas/EventCard';");
}
if (!content.includes("const [viewingEventExpanded, setViewingEventExpanded]")) {
  replaceAll("const [loadingAvisos, setLoadingAvisos] = useState(false);", "const [loadingAvisos, setLoadingAvisos] = useState(false);\r\n  const [viewingEventExpanded, setViewingEventExpanded] = useState(true);\r\n  const [viewingEventTab, setViewingEventTab] = useState<'team' | 'repertoire' | 'notices'>('team');");
}
if (!content.includes("setViewingEventExpanded(true);")) {
  replaceAll("  useEffect(() => {\r\n    if (selectedMember) {\r\n      fetchAvisosGerais();\r\n    }\r\n  }, [selectedMember]);", "  useEffect(() => {\r\n    if (selectedMember) {\r\n      fetchAvisosGerais();\r\n    }\r\n  }, [selectedMember]);\r\n\r\n  useEffect(() => {\r\n    if (viewingEvent) {\r\n      setViewingEventExpanded(true);\r\n      setViewingEventTab('team');\r\n    }\r\n  }, [viewingEvent]);");
}

const start = content.indexOf('{viewingEvent && (');
const secondMarker = content.indexOf('{/* Sub-Modal: Detalhes do Evento */}', start);
const close = content.indexOf('      )}', secondMarker);
if (start === -1 || secondMarker === -1 || close === -1) throw new Error('Markers not found');

const lines = [
"      {viewingEvent && (",
"        <div className=\"fixed inset-0 z-[800] flex items-center justify-center p-4 lg:pl-[312px] antialiased\">",
"          <div className=\"absolute inset-0 bg-slate-900/80\" onClick={() => onViewingEventChange(null)}></div>",
"          <div className=\"relative w-full max-w-4xl max-h-[85vh] lg:max-h-[90vh] bg-[#f4f7fa] dark:bg-[#0b1120] rounded-[2rem] lg:rounded-[3rem] shadow-2xl overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800\">",
"            <div className=\"p-6 lg:p-10\">",
"              <div className=\"flex items-center justify-between mb-8\">",
"                <h3 className=\"text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase leading-none\">",
"                  Detalhes da Escala",
"                </h3>",
"                <button",
"                  onClick={() => onViewingEventChange(null)}",
"                  className=\"w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all border border-slate-100 dark:border-slate-700 shadow-sm\"",
"                >",
"                  <i className=\"fas fa-times\"></i>",
"                </button>",
"              </div>",
"",
"              <EventCard",
"                event={viewingEvent}",
"                isExpanded={viewingEventExpanded}",
"                onToggle={() => setViewingEventExpanded((current) => !current)}",
"                activeSubTab={viewingEventTab}",
"                onSubTabChange={setViewingEventTab}",
"                showRepertoire",
"              >",
"                {viewingEventTab === 'team' && (",
"                  <div className=\"p-6\">",
"                    <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">",
"                      {viewingEvent.members.map((member, index) => (",
"                        <div key={`${member.id}-${index}`} className=\"bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700\">",
"                          <div className=\"flex flex-col items-center text-center\">",
"                            <div className=\"relative mb-3\">",
"                              <div className=\"w-16 h-16 bg-gradient-to-br from-brand to-brand-gold rounded-full flex items-center justify-center shadow-lg\">",
"                                {member.avatar ? (",
"                                  <img src={member.avatar} alt={member.name} className=\"w-full h-full rounded-full object-cover\" />",
"                                ) : (",
"                                  <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-white text-xl`}></i>",
"                                )}",
"                              </div>",
"                              <div className=\"absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md border-2 border-brand\">",
"                                <i className={`fas ${getRoleIcon(member.roles && member.roles.length > 0 ? member.roles[0] : member.role)} text-brand text-[8px]`}></i>",
"                              </div>",
"                            </div>",
"                            <h5 className=\"text-[11px] font-black text-slate-800 dark:text-white uppercase truncate w-full\">{member.name}</h5>",
"                            <div className=\"flex flex-col items-center gap-1 mt-2\">",
"                              {member.roles && member.roles.length > 1 ? (",
"                                <div className=\"text-center\">",
"                                  <p className=\"text-[9px] font-bold text-slate-400 uppercase leading-tight\">{member.roles.join(' / ')}</p>",
"                                  {member.roles.length > 2 && <span className=\"text-[7px] font-bold text-brand\">+{member.roles.length - 1} funções</span>}",
"                                </div>",
"                              ) : (",
"                                <p className=\"text-[9px] font-bold text-slate-400 uppercase truncate w-full\">{member.role}</p>",
"                              )}",
"                              <div className=\"flex items-center gap-1 mt-2\">",
"                                <div className=\"w-2 h-2 rounded-full bg-green-500\"></div>",
"                                <span className=\"text-[7px] font-bold text-slate-500 uppercase\">Escalado</span>",
"                              </div>",
"                            </div>",
"                          </div>",
"                        </div>",
"                      ))}",
"                    </div>",
"                    {viewingEvent.members.length === 0 && (",
"                      <div className=\"text-center py-8\">",
"                        <div className=\"w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3\">",
"                          <i className=\"fas fa-users-slash text-slate-400 text-lg\"></i>",
"                        </div>",
"                        <p className=\"text-[10px] font-bold text-slate-400 uppercase tracking-widest\">Nenhum membro escalado</p>",
"                      </div>",
"                    )}",
"                  </div>",
"                )}",
"",
"                {viewingEventTab === 'repertoire' && (",
"                  <div className=\"p-6\">",
"                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3\">",
"                      {viewingEvent.repertoire.map((song) => (",
"                        <div key={song.id} className=\"group bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden\">",
"                          <div className=\"flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700\">",
"                            <div className=\"w-10 h-10 bg-brand text-white rounded-lg flex items-center justify-center font-black text-[8px] shrink-0\">{song.key || 'N/D'}</div>",
"                            <div className=\"flex-1 px-4\">",
"                              <h5 className=\"text-[11px] font-black text-slate-800 dark:text-white uppercase truncate\">{song.musica} - {song.cantor}</h5>",
"                              <p className=\"text-[9px] font-bold text-slate-400 uppercase\">Ministro: <span className=\"text-brand\">{song.minister || 'Sem ministro'}</span></p>",
"                            </div>",
"                          </div>",
"                        </div>",
"                      ))}",
"                    </div>",
"                    {viewingEvent.repertoire.length === 0 && (",
"                      <div className=\"text-center py-8\">",
"                        <div className=\"w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3\">",
"                          <i className=\"fas fa-music-slash text-slate-400 text-lg\"></i>",
"                        </div>",
"                        <p className=\"text-[10px] font-bold text-slate-400 uppercase tracking-widest\">Nenhuma música no repertório</p>",
"                      </div>",
"                    )}",
"                  </div>",
"                )}",
"",
"                {viewingEventTab === 'notices' && (",
"                  <div className=\"p-6\">",
"                    <div className=\"space-y-3\">",
"                      {noticesForViewingEvent.map((notice) => (",
"                        <div key={notice.id} className=\"bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700\">",
"                          <div className=\"flex justify-between items-center mb-1.5\">",
"                            <span className=\"text-[8px] font-black text-brand uppercase tracking-widest\">{notice.sender}</span>",
"                            <span className=\"text-[7px] font-bold text-slate-400 uppercase\">{notice.time}</span>",
"                          </div>",
"                          <p className=\"text-[10px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed\">{notice.text}</p>",
"                        </div>",
"                      ))}",
"                    </div>",
"                    {noticesForViewingEvent.length === 0 && (",
"                      <div className=\"text-center py-8\">",
"                        <div className=\"w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3\">",
"                          <i className=\"fas fa-bell-slash text-slate-400 text-lg\"></i>",
"                        </div>",
"                        <p className=\"text-[10px] font-bold text-slate-400 uppercase tracking-widest\">Nenhum aviso</p>",
"                      </div>",
"                    )}",
"                  </div>",
"                )}",
"              </EventCard>",
"            </div>",
"          </div>",
"        </div>",
"      )}"
];
const newBlock = lines.join('\r\n');
content = content.slice(0, start) + newBlock + content.slice(close + '      )}'.length);
fs.writeFileSync(path, content, 'utf8');
console.log('updated');
