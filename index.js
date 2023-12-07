if (!global.sharedTeraState) {
    global.sharedTeraState = {
    };
}

module.exports = function sharedterastate(mod) {


	const order = { order: 100 };
	const order_loc = { order: -100 , filter: { fake: null } };
	const eventDpsQueue = [];
	global.sharedTeraState.items = {};
	let ui = null,
		hooks = [],
		horaServidorInicial = null,
		horaLocalInicial = null;
	global.sharedTeraState.partyMembers = [];
	
	
    function hook() {
        hooks.push(mod.hook(...arguments));
    }	
    function unload() {
        if (hooks.length) {
            for (let h of hooks)
                mod.unhook(h);
            hooks = [];
        }
    }
    function updatePlayerLocation(event) {
        global.sharedTeraState.myPosition = event.loc;
        global.sharedTeraState.myAngle = event.w;
		if(global.sharedTeraState.bossId && global.sharedTeraState.bossLoc) {
			updateAngleToFaceBoss(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
			global.sharedTeraState.distanceFromBoss = getDistance(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
		}
    }

    function updateBossLocation(event) {
        global.sharedTeraState.bossLoc = event.loc;
        global.sharedTeraState.bossAngle = event.w;
		updateAngleToFaceBoss(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
		global.sharedTeraState.distanceFromBoss = getDistance(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
    }

    function updateAngleToFaceBoss(playerLocation, bossLocation) {
        const dx = bossLocation.x - playerLocation.x;
        const dy = bossLocation.y - playerLocation.y;
        global.sharedTeraState.AngleToFaceBoss = Math.atan2(dy, dx);
    }	

    function updatePlayerStats(event) {
        global.sharedTeraState.aspd = (event.attackSpeed + event.attackSpeedBonus) /100;
		global.sharedTeraState.myHp = Number(event.hp);
		global.sharedTeraState.myMp = Number(event.mp);
		global.sharedTeraState.myMaxHp = Number(event.maxHp);
		global.sharedTeraState.myMaxMp = Number(event.maxMp);
		global.sharedTeraState.myCurHp = (global.sharedTeraState.myHp / global.sharedTeraState.myMaxHp) * 100;
		global.sharedTeraState.myCurMp = (global.sharedTeraState.myMp / global.sharedTeraState.myMaxMp) * 100;
    }	

    function findMonster(gameId) {
        return global.sharedTeraState.monsters.find(m => m.gameId === gameId);
    }

    function findItem(id) {
        return global.sharedTeraState.items.find(i => i.id === id);
    }	

    function updateBossInfo(event) {
        if (global.sharedTeraState.bossId && global.sharedTeraState.bossId === event.id) {
			global.sharedTeraState.bossCurHp = Number(event.curHp);
			global.sharedTeraState.bossMaxHp = Number(event.maxHp);
			global.sharedTeraState.bosscurHpPerc = (global.sharedTeraState.bossCurHp / global.sharedTeraState.bossMaxHp) * 100;			
		} else {
			global.sharedTeraState.bossId = event.id;
			global.sharedTeraState.bosshuntingZoneId = event.huntingZoneId;
			global.sharedTeraState.bosstemplateId = event.templateId;
			mod.send("S_CUSTOM_STYLE_SYSTEM_MESSAGE", 1, {
				message: "Boss detected",
				style: 51
			})
			mod.send("S_PLAY_SOUND", 1, {
				SoundID: 2021
			})		
			let monster = findMonster(event.id);
			if (monster) {
				global.sharedTeraState.bossLoc = monster.loc;
				global.sharedTeraState.bossAngle = monster.w;
				updateAngleToFaceBoss(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
				global.sharedTeraState.distanceFromBoss = getDistance(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);				
			}
		}
    }
	function getDistance(locA, locB) {
		return Math.sqrt(Math.pow((locA.x - locB.x), 2) + Math.pow((locA.y - locB.y), 2) + Math.pow((locA.z - locB.z), 2))
	}	
	
    function updateMyData(event) {
		global.sharedTeraState.gameId = event.gameId;
		global.sharedTeraState.playerId = event.playerId;
		global.sharedTeraState.templateId = event.templateId;
    }	

    function updateItemCooldown(event) {
		let item = findItem(event.item);
		if (item) {
			item.isOnCooldown = true;
			setTimeout(function () {
				item.isOnCooldown = false;
			}, event.cooldown * 1000);			
		}
    }
	
	function dpsMeter(event) {
		eventDpsQueue.push(event);
		processDpsEventQueue();		
	}
	function processDpsEventQueue() {
		while (eventDpsQueue.length > 0) {
			const event = eventDpsQueue.shift();
			processDpsEvent(event);
		}
	}
	function processDpsEvent(event) {
		if ((mod.game.me.gameId === event.source || mod.game.me.gameId === event.owner) &&
			(global.sharedTeraState.bossId) && (event.target === global.sharedTeraState.bossId)) {
			
			if (!global.sharedTeraState.myTotalDmg) {
				if(!global.sharedTeraState.startDps) {
					global.sharedTeraState.startDps = Date.now();
				};
				global.sharedTeraState.myTotalDmg = event.value;
			} else {
				global.sharedTeraState.checkedDps = Date.now();
				global.sharedTeraState.myTotalDmg += event.value;

				const timeElapsedMs = global.sharedTeraState.checkedDps - global.sharedTeraState.startDps;
				if (timeElapsedMs > 0) {
					const scaledDamage = global.sharedTeraState.myTotalDmg * BigInt(1000);
					const scaledDps = scaledDamage / BigInt(timeElapsedMs);
					global.sharedTeraState.myDps = scaledDps / BigInt(1000);			
				}
			}			
		};
		let member = ((global.sharedTeraState.partyMembers.find(m => m.gameId === event.source)) || (global.sharedTeraState.partyMembers.find(m => m.gameId === event.owner)));
		if ((member) && (global.sharedTeraState.bossId) && (event.target === global.sharedTeraState.bossId)) {

			if (!member.totalDmg) {
				if(!global.sharedTeraState.startDps) {
					global.sharedTeraState.startDps = Date.now();
				};
				member.totalDmg = event.value;
			} else {
				member.checkedDps = Date.now();
				member.totalDmg += event.value;
				const timeElapsedMs = member.checkedDps - global.sharedTeraState.startDps;
				if (timeElapsedMs > 0) {
					const scaledDamage = member.totalDmg * BigInt(1000);
					const scaledDps = scaledDamage / BigInt(timeElapsedMs);
					member.dps = scaledDps / BigInt(1000);					
				}
			}
		};
	}	


	function formatBigInt(bigintValue) {
		let str = bigintValue.toString();
		let formatted = "";
		let length = str.length;
		for (let i = 0; i < length; i++) {
			if (i > 0 && i % 3 === 0) {
				formatted = "." + formatted;
			}
			formatted = str[length - 1 - i] + formatted;
		}
		return formatted;
	}

    function load() {
        if (!hooks.length) {
			
			hook('C_START_SKILL', 7, order_loc, updatePlayerLocation);
			hook('C_START_INSTANCE_SKILL', 7, order_loc, updatePlayerLocation);
			hook('C_PRESS_SKILL', 4, order_loc, updatePlayerLocation);
			hook('C_START_TARGETED_SKILL', 7, order_loc, updatePlayerLocation);
			hook('C_START_COMBO_INSTANT_SKILL', 6, order_loc, updatePlayerLocation);
			hook('C_NOTIFY_LOCATION_IN_DASH', 4, order, updatePlayerLocation);
			hook('C_NOTIFY_LOCATION_IN_ACTION', 4, order, updatePlayerLocation);
			hook('S_SPAWN_ME', 3, order, updatePlayerLocation);
			hook('S_PLAYER_STAT_UPDATE', 14, order, updatePlayerStats);
			hook('S_EACH_SKILL_RESULT', 14, { order: Infinity }, dpsMeter);
			
			hook('S_LOAD_TOPO', 3, () => {
				Object.assign(global.sharedTeraState, {
					bossId: null,
					bosshuntingZoneId: null,
					bosstemplateId: null,
					bossAbnormalities: {},
					bossLoc: null,
					bossAngle: null,
					AngleToFaceBoss: null,
					distanceFromBoss: null,
					enraged: false,
					remainingEnrageTime: null,
					bossCurHp: null,
					bossMaxHp: null,
					bosscurHpPerc: null,
					bossStatus: null,
					bossHPLevel: null,
					monsters: [],
					startDps: null,
					checkedDps: null,
					myTotalDmg: null,
					myDps: null
					
				});
			});
		hook('C_PLAYER_LOCATION', 5, order, event => {
			global.sharedTeraState.myPosition = event.loc;
			global.sharedTeraState.myAngle = event.w;
			if(global.sharedTeraState.bossId && global.sharedTeraState.bossLoc) {
				updateAngleToFaceBoss(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
				global.sharedTeraState.distanceFromBoss = getDistance(global.sharedTeraState.myPosition, global.sharedTeraState.bossLoc);
			};
			if(!horaServidorInicial) {
				horaServidorInicial = event.time;
				horaLocalInicial = Date.now();
				setInterval(() => {
					let horaActual = Date.now();
					let diferenciaTiempo = horaActual - horaLocalInicial;
					global.sharedTeraState.serverTime = horaServidorInicial + diferenciaTiempo - 5;
				}, 500);
			};			
		});			

			hook('S_SPAWN_NPC', 11, order, event => {
				global.sharedTeraState.monsters.push({ gameId: event.gameId, loc: event.loc, w: event.w });
			});

			hook('S_BOSS_GAGE_INFO', 3, order, updateBossInfo);		

			hook('S_NPC_LOCATION', 3, order, event => {
				let monster = findMonster(event.gameId);
				if (monster) monster.loc = event.loc;
				if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}
			});

			hook('S_DESPAWN_NPC', 3, order, event => {
				global.sharedTeraState.monsters = global.sharedTeraState.monsters.filter(m => m.gameId !== event.gameId);
				if (global.sharedTeraState.bossId === event.gameId) {
					if(global.sharedTeraState.myDps) {
						mod.command.message("My DPS: " + `<font color='#04FE00'>${(formatBigInt(global.sharedTeraState.myDps))}</font>`);
					};
					Object.assign(global.sharedTeraState, {
						bossId: null,
						bosshuntingZoneId: null,
						bosstemplateId: null,					
						bossAbnormalities: {},
						bossLoc: null,
						bossAngle: null,
						AngleToFaceBoss: null,
						distanceFromBoss: null,
						enraged: false,
						remainingEnrageTime: null,
						bossCurHp: null,
						bossMaxHp: null,
						bosscurHpPerc: null,
						bossStatus: null,
						bossHPLevel: null,
						startDps: null,
						checkedDps: null,
						myTotalDmg: null,
						myDps: null
					});
					if(global.sharedTeraState.partyMembers) {
						for(let i = 0; i < global.sharedTeraState.partyMembers.length; i++) {
								mod.command.message(global.sharedTeraState.partyMembers[i].name + " DPS: " + `<font color='#04FE00'>${(formatBigInt(global.sharedTeraState.partyMembers[i].dps))}</font>`);
								global.sharedTeraState.partyMembers[i].totalDmg = null;
								global.sharedTeraState.partyMembers[i].dps = null;
								global.sharedTeraState.partyMembers[i].checkedDps = null;
						}
					};					
				}
			});

			hook('S_ACTION_STAGE', 9, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}
				if (mod.game.me.gameId === event.gameId) {
					updatePlayerLocation(event);
				}
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;				
			});

			hook('S_ACTION_END', 5, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}
				if (mod.game.me.gameId === event.gameId) {
					updatePlayerLocation(event);
				}
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;				
			});

			hook('S_INSTANT_DASH', 3, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}
				if (mod.game.me.gameId === event.gameId) {
					updatePlayerLocation(event);
				}
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;				
			});

			hook('S_INSTANT_MOVE', 3, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}
				if (mod.game.me.gameId === event.gameId) {
					updatePlayerLocation(event);
				}
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;				
			});

			hook('S_INSTANT_MOVE', 3, { order: -100, filter: { fake: true } }, event => {
				/*if (global.sharedTeraState.bossId === event.gameId) {
					updateBossLocation(event);
				}*/
				if (mod.game.me.gameId === event.gameId) {
					updatePlayerLocation(event);
				}
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;				
			});	

			hook('S_CREATURE_ROTATE', 2, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					global.sharedTeraState.bossAngle = event.w;
				}
			});

			hook('S_NPC_STATUS', 2, order, event => {
				if (global.sharedTeraState.bossId === event.gameId) {
					global.sharedTeraState.enraged = event.enraged;
					global.sharedTeraState.remainingEnrageTime = event.remainingEnrageTime;
					global.sharedTeraState.bossStatus = event.status;
					global.sharedTeraState.bossHPLevel = event.hpLevel;
				}
			});

			hook('S_ABNORMALITY_BEGIN', 3, order, (event) => {
				if (mod.game.me.gameId === event.source && global.sharedTeraState.bossId === event.target) {
					const abnormalitydata = global.sharedTeraState.bossAbnormalities;
					const id = event.id;
					const until = Date.now() + event.duration;
					global.sharedTeraState.bossAbnormalities[id] = {
						id,
						stacks: event.stacks,
						until,
						get remaining() { return Math.max(0, until - Date.now()); },
						get data() { return abnormalitydata.get(id); }
					};
				}
			});

			hook('S_ABNORMALITY_REFRESH', 1, order, (event) => {
				if (global.sharedTeraState.bossId === event.target && global.sharedTeraState.bossAbnormalities[event.id]) {
					const abnormalitydata = global.sharedTeraState.bossAbnormalities;
					const id = event.id;
					const until = Date.now() + event.duration;
					global.sharedTeraState.bossAbnormalities[id] = {
						id,
						stacks: event.stacks,
						until,
						get remaining() { return Math.max(0, until - Date.now()); },
						get data() { return abnormalitydata.get(id); }
					};
				}
			});

			hook('S_ABNORMALITY_END', 1, order, (event) => {
				if (global.sharedTeraState.bossId === event.target && global.sharedTeraState.bossAbnormalities[event.id])
					delete global.sharedTeraState.bossAbnormalities[event.id];
			});
			
            hook('S_PARTY_MEMBER_LIST', 7, order, (event) => {             
                const copy = global.sharedTeraState.partyMembers;          
                global.sharedTeraState.partyMembers = event.members.filter(m => m.playerId != mod.game.me.playerId);
                if (copy) {
                    for(let i = 0; i < global.sharedTeraState.partyMembers.length; i++) {
                        const copyMember = copy.find(m => m.playerId == global.sharedTeraState.partyMembers[i].playerId);
                        if (copyMember) {
                            global.sharedTeraState.partyMembers[i].gameId = copyMember.gameId;
                            if (copyMember.loc) global.sharedTeraState.partyMembers[i].loc = copyMember.loc;
                        }
                    }
                }
            });
            hook('S_LEAVE_PARTY', 1, order, (event) => {
                global.sharedTeraState.partyMembers = [];
            });
            hook('S_SPAWN_USER', 15, order, (event) => {
                if (global.sharedTeraState.partyMembers.length != 0) {
                    let member = global.sharedTeraState.partyMembers.find(m => m.playerId === event.playerId);
                    if (member) {
                        member.gameId = event.gameId;
                        member.loc = event.loc;
                        member.alive = event.alive;
                        member.hpP = (event.alive ? 100 : 0);
						member.name = event.name;
						member.totalDmg = null;
						member.dps = null;
						member.job = (event.templateId - 10101) % 100;
                    }
                }
            });
            hook('S_USER_LOCATION', 5, order, (event) => {     
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;
            })
            
            hook('S_USER_LOCATION_IN_ACTION', 2, order, (event) => {
                let member = global.sharedTeraState.partyMembers.find(m => m.gameId === event.gameId);
                if (member) member.loc = event.loc;
            })
            
            hook('S_PARTY_MEMBER_CHANGE_HP', 4, order, (event) => {
                if (mod.game.me.playerId == event.playerId) return;
                let member = global.sharedTeraState.partyMembers.find(m => m.playerId === event.playerId);
                if (member) {
                    member.hpP = (Number(event.currentHp) / Number(event.maxHp)) * 100;
                }
            })
            
            hook('S_PARTY_MEMBER_STAT_UPDATE', 3, order, (event) => {
                if (mod.game.me.playerId == event.playerId) return;
                let member = global.sharedTeraState.partyMembers.find(m => m.playerId === event.playerId);
                if (member) {
                    member.hpP = (Number(event.curHp) / Number(event.maxHp)) * 100;    
                    member.alive = event.alive;
                }
            })
            
            hook('S_DEAD_LOCATION', 2, order, (event) => {
                let member = global.sharedTeraState.partyMembers.find(m => (m.gameId === event.gameId));
                if (member) {
                    member.loc = event.loc;
                    member.hpP = 0;
                    member.alive = false;
                }
            })
            
            hook('S_LEAVE_PARTY_MEMBER', 2, order, (event) => {
                global.sharedTeraState.partyMembers = global.sharedTeraState.partyMembers.filter(m => m.playerId != event.playerId);                
            });
             
            hook('S_LOGOUT_PARTY_MEMBER', 1, order, (event) => {
                let member = global.sharedTeraState.partyMembers.find(m => m.playerId === event.playerId);
                if (member) member.online = false;                
            });
            
            hook('S_BAN_PARTY_MEMBER', 1, order, (event) => {
                global.sharedTeraState.partyMembers = global.sharedTeraState.partyMembers.filter(m => m.playerId != event.playerId);
            });			

        }
    }
	load();	
}
