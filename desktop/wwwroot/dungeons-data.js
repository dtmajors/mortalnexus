export const DUNGEONS = [
  {
    "id": "mellisars-vault",
    "name": "Mellisar's Vault",
    "region": "Myrland — Meduli / Badlands edge (Meduli Entrance ↔ Badlands Entrance)",
    "difficulty": "Medium-Hard",
    "groupSize": "Small group (2-5)",
    "level": "Mid",
    "summary": "Two-entrance Myrland vault complex linking Meduli to the Badlands. Vault 1 (top, Meduli Entrance, Pig Statue, East Stairs, Connector down). Vault 2 (middle, Connector ↔ Connector, Badlands Entrance south). Basement holds the Boss Room and East/West Stairs. Urns are chest-traps; black triangles in the source map mark dark-room starts.",
    "mobs": [
      "Walking Dead",
      "Risen Sacrifice",
      "Bandit (entrance area)",
      "Vault Guardian (boss)"
    ],
    "drops": [
      "Urn with Gems (rare)",
      "Locked Chests (require key)",
      "Bone Tissue",
      "Quality Leather"
    ],
    "verified": false,
    "caveats": [
      "Urns are gem-loot containers; black-triangle markers indicate dark-room starts (per the community source-map legend).",
      "Chests in the West Stairs area are locked — bring keys or Lockpicking.",
      "Two entrances mean ambush risk on both sides."
    ],
    "levels": [
      {
        "id": "vault-1",
        "name": "Vault 1 (Meduli Entrance)",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "meduli-entrance",
            "name": "Meduli Entrance",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 4,
              "w": 14,
              "h": 10
            }
          },
          {
            "id": "v1-upper",
            "name": "Upper Halls",
            "shape": {
              "kind": "rect",
              "x": 28,
              "y": 18,
              "w": 38,
              "h": 22
            }
          },
          {
            "id": "pig-statue",
            "name": "Pig Statue Hall",
            "shape": {
              "kind": "rect",
              "x": 32,
              "y": 44,
              "w": 18,
              "h": 16
            }
          },
          {
            "id": "east-stairs-1",
            "name": "East Stairs (down)",
            "shape": {
              "kind": "rect",
              "x": 64,
              "y": 50,
              "w": 14,
              "h": 12
            }
          },
          {
            "id": "connector-1",
            "name": "Connector (down)",
            "shape": {
              "kind": "rect",
              "x": 40,
              "y": 76,
              "w": 14,
              "h": 10
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                51,
                14
              ],
              [
                51,
                18
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                40,
                40
              ],
              [
                40,
                44
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                50,
                60
              ],
              [
                50,
                76
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                66,
                40
              ],
              [
                66,
                50
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              51,
              4
            ],
            "facing": "N",
            "kind": "gate",
            "label": "Meduli Entrance"
          },
          {
            "at": [
              47,
              86
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Connector to Vault 2"
          },
          {
            "at": [
              78,
              56
            ],
            "facing": "E",
            "kind": "gate",
            "label": "East Stairs to Basement"
          }
        ],
        "markers": [
          {
            "kind": "entrance",
            "at": [
              51,
              6
            ],
            "label": "Meduli Entrance"
          },
          {
            "kind": "altar",
            "at": [
              41,
              52
            ],
            "label": "Pig Statue"
          },
          {
            "kind": "stairs-down",
            "at": [
              70,
              56
            ],
            "label": "East Stairs (to Basement)"
          },
          {
            "kind": "stairs-down",
            "at": [
              47,
              82
            ],
            "label": "Connector (to Vault 2)"
          }
        ],
        "labels": [
          {
            "at": [
              51,
              1
            ],
            "text": "Meduli Entrance",
            "tone": "title",
            "size": 2.4
          },
          {
            "at": [
              41,
              42
            ],
            "text": "Pig Statue",
            "tone": "normal",
            "size": 2
          },
          {
            "at": [
              70,
              48
            ],
            "text": "East Stairs",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              47,
              90
            ],
            "text": "Connector",
            "tone": "muted",
            "size": 1.8
          }
        ]
      },
      {
        "id": "vault-2",
        "name": "Vault 2 (mid floor)",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "connector-w",
            "name": "Connector (W, from Vault 1)",
            "shape": {
              "kind": "rect",
              "x": 12,
              "y": 6,
              "w": 14,
              "h": 10
            }
          },
          {
            "id": "connector-e",
            "name": "Connector (E, from Vault 1)",
            "shape": {
              "kind": "rect",
              "x": 74,
              "y": 6,
              "w": 14,
              "h": 10
            }
          },
          {
            "id": "v2-main",
            "name": "Main Vault Floor",
            "shape": {
              "kind": "rect",
              "x": 22,
              "y": 22,
              "w": 56,
              "h": 50
            }
          },
          {
            "id": "v2-east-stairs",
            "name": "East Stairs (down)",
            "shape": {
              "kind": "rect",
              "x": 72,
              "y": 56,
              "w": 16,
              "h": 14
            }
          },
          {
            "id": "badlands",
            "name": "Badlands Entrance",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 80,
              "w": 14,
              "h": 14
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                19,
                16
              ],
              [
                30,
                22
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                81,
                16
              ],
              [
                72,
                22
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                51,
                72
              ],
              [
                51,
                80
              ]
            ],
            "width": 2.4
          }
        ],
        "doors": [
          {
            "at": [
              19,
              6
            ],
            "facing": "N",
            "kind": "gate",
            "label": "From Vault 1 (W connector)"
          },
          {
            "at": [
              81,
              6
            ],
            "facing": "N",
            "kind": "gate",
            "label": "From Vault 1 (E connector)"
          },
          {
            "at": [
              51,
              94
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Badlands Entrance"
          },
          {
            "at": [
              88,
              63
            ],
            "facing": "E",
            "kind": "gate",
            "label": "East Stairs to Basement"
          }
        ],
        "markers": [
          {
            "kind": "stairs-up",
            "at": [
              19,
              8
            ],
            "label": "Connector W (from Vault 1)"
          },
          {
            "kind": "stairs-up",
            "at": [
              81,
              8
            ],
            "label": "Connector E (from Vault 1)"
          },
          {
            "kind": "chest",
            "at": [
              50,
              38
            ],
            "label": "Vault floor chests"
          },
          {
            "kind": "stairs-down",
            "at": [
              80,
              63
            ],
            "label": "East Stairs (to Basement)"
          },
          {
            "kind": "entrance",
            "at": [
              51,
              90
            ],
            "label": "Badlands Entrance"
          }
        ],
        "labels": [
          {
            "at": [
              19,
              2
            ],
            "text": "Connector",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              81,
              2
            ],
            "text": "Connector",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              50,
              48
            ],
            "text": "Mellisar's Vault",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              51,
              98
            ],
            "text": "Badlands Entrance",
            "tone": "normal",
            "size": 2
          }
        ]
      },
      {
        "id": "basement",
        "name": "Basement",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "boss-room",
            "name": "Boss Room",
            "shape": {
              "kind": "rect",
              "x": 6,
              "y": 12,
              "w": 18,
              "h": 16
            },
            "tone": "hazard"
          },
          {
            "id": "bsmt-main",
            "name": "Basement Hub",
            "shape": {
              "kind": "rect",
              "x": 26,
              "y": 30,
              "w": 48,
              "h": 36
            }
          },
          {
            "id": "bsmt-east-stairs",
            "name": "East Stairs (up)",
            "shape": {
              "kind": "rect",
              "x": 74,
              "y": 38,
              "w": 14,
              "h": 16
            }
          },
          {
            "id": "bsmt-west-stairs",
            "name": "West Stairs (up)",
            "shape": {
              "kind": "rect",
              "x": 8,
              "y": 74,
              "w": 14,
              "h": 14
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                20,
                28
              ],
              [
                30,
                32
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                74,
                46
              ],
              [
                74,
                46
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                22,
                80
              ],
              [
                30,
                66
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              22,
              88
            ],
            "facing": "W",
            "kind": "gate",
            "label": "West Stairs (up to Vault 2)"
          },
          {
            "at": [
              88,
              46
            ],
            "facing": "E",
            "kind": "gate",
            "label": "East Stairs (up to Vault 2)"
          }
        ],
        "markers": [
          {
            "kind": "boss",
            "at": [
              15,
              18
            ],
            "label": "Vault Guardian"
          },
          {
            "kind": "stairs-up",
            "at": [
              82,
              46
            ],
            "label": "East Stairs (to Vault 2)"
          },
          {
            "kind": "stairs-up",
            "at": [
              15,
              82
            ],
            "label": "West Stairs (to Vault 2)"
          },
          {
            "kind": "chest",
            "at": [
              40,
              48
            ],
            "label": "Locked chest cluster"
          }
        ],
        "labels": [
          {
            "at": [
              15,
              4
            ],
            "text": "Boss Room",
            "tone": "hazard",
            "size": 2.2
          },
          {
            "at": [
              50,
              24
            ],
            "text": "Basement",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              82,
              32
            ],
            "text": "East Stairs",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              15,
              70
            ],
            "text": "West Stairs",
            "tone": "muted",
            "size": 1.8
          }
        ]
      }
    ],
    "sources": [
      "datainfo/dungeonsMyrland/MellisarsVault1.png (Vault 1, Meduli Entrance side)",
      "datainfo/dungeonsMyrland/MellisarsVault2.png (Vault 2, Badlands Entrance side)",
      "datainfo/dungeonsMyrland/MellisarsVault - Basement.png (Basement + Boss Room)"
    ]
  },
  {
    "id": "tomb-of-sarducaa",
    "name": "Tomb of Sarducaa",
    "region": "Sarducaa · ancient burial site",
    "difficulty": "Medium-Hard",
    "groupSize": "Small group",
    "level": "Mid",
    "summary": "Ancient Sarducaan burial complex. Multi-level tomb with skeletal undead, mummified guardians and Risen variants — Spiritism/Necromancy-flavoured dive, live with the Sarducaa expansion.",
    "mobs": [
      "Sarducaan Mummy",
      "Risen Sacrifice",
      "Tomb Guardian (mini-boss)",
      "Necromancer (boss)",
      "Sarducaan Skeleton"
    ],
    "drops": [
      "Bone Tissue",
      "Ritual Blood",
      "Lodestone Powder",
      "Spirit Box (Small/Medium)",
      "Sarducaan relic fragments"
    ],
    "verified": false,
    "caveats": [
      "Re-added 2026-06-26 — Sarducaa is live. Layout is a stub awaiting community-mapped reference.",
      "Mob list is best-effort from community sources + audit; ping owner for in-game verification."
    ],
    "levels": [
      {
        "id": "entrance",
        "name": "Entrance Chamber",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "antechamber",
            "name": "Antechamber",
            "shape": {
              "kind": "rect",
              "x": 40,
              "y": 10,
              "w": 20,
              "h": 14
            },
            "tone": "safe"
          }
        ],
        "corridors": [],
        "doors": [],
        "markers": [
          {
            "kind": "entrance",
            "at": [
              50,
              18
            ],
            "label": "Tomb of Sarducaa"
          },
          {
            "kind": "boss",
            "at": [
              50,
              60
            ],
            "label": "Necromancer (boss)"
          }
        ]
      }
    ],
    "sources": [
      "Re-added per audit workflow wf_f7ea8a82-ca0 (Sarducaa live since 2.2.x).",
      "packages/game-data/sarducaa/pois.json (52 live Sarducaa POIs)"
    ]
  },
  {
    "id": "tagmaton-hive",
    "name": "Tagmaton Hive",
    "region": "Sarducaa · Reckoning Tagmaton biome",
    "difficulty": "Hard",
    "groupSize": "Group",
    "level": "High",
    "summary": "Tagmaton breeding/spawn area. Heavy carapace-armored arthropod swarms, multiple Tagmaton variants (Drone/Lancer/Borer/Slayer/Harbinger/Bulwark/Broodmother/Disgorger). Source of Crepite/Dense Crepite/Huskweave/Reptile Carapace farming and Reckoning-tier alchemy ingredients.",
    "mobs": [
      "Tagmaton Drone",
      "Tagmaton Lancer",
      "Tagmaton Borer",
      "Tagmaton Slayer",
      "Tagmaton Harbinger",
      "Tagmaton Bulwark",
      "Tagmaton Broodmother (boss)",
      "Tagmaton Disgorger"
    ],
    "drops": [
      "Reptile Carapace",
      "Crepite",
      "Dense Crepite",
      "Huskweave",
      "Tagmaton DH-multiplier alchemy ingredients (per butchery/tagmaton.json)"
    ],
    "verified": false,
    "caveats": [
      "Re-added 2026-06-26 — Tagmaton family is a flagship Reckoning content block. Layout is a stub awaiting field mapping.",
      "Butchery yields per 10k mass live in packages/game-data/butchery/tagmaton.json."
    ],
    "levels": [
      {
        "id": "entrance",
        "name": "Hive Entrance",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "approach",
            "name": "Hive Approach",
            "shape": {
              "kind": "rect",
              "x": 38,
              "y": 10,
              "w": 24,
              "h": 14
            },
            "tone": "safe"
          }
        ],
        "corridors": [],
        "doors": [],
        "markers": [
          {
            "kind": "entrance",
            "at": [
              50,
              18
            ],
            "label": "Tagmaton Hive"
          },
          {
            "kind": "boss",
            "at": [
              50,
              60
            ],
            "label": "Tagmaton Broodmother"
          }
        ]
      }
    ],
    "sources": [
      "Re-added per audit workflow wf_f7ea8a82-ca0 (Reckoning content block).",
      "packages/game-data/butchery/tagmaton.json"
    ]
  },
  {
    "id": "necromancy-dungeon",
    "name": "Tower of Decensus (Necromancy Dungeon)",
    "region": "Myrland (remote)",
    "difficulty": "Hard",
    "groupSize": "Group (3-6)",
    "level": "Mid-High",
    "summary": "The 5-floor Necromancy progression dungeon: The Tower (entrance), The Library (book-trigger to Catacombs), The Catacombs, The Maze, The Ossuary (boss). Each floor links to the next via a hidden passage or named exit. Floor maps community-transcribed from datainfo/dungeonsMyrland PNG set (2026-06-26).",
    "mobs": [
      "Necromancer (boss)",
      "Risen Jungle Troll (Maze boss)",
      "Walking Dead",
      "Risen Sacrifice"
    ],
    "drops": [
      "Necromancer's Heart (key item — unlocks Necromancy line)",
      "Ritual Blood",
      "Ritual Ashes",
      "Lodestone Powder"
    ],
    "verified": false,
    "caveats": [
      "Boss raises any add corpse within line-of-sight — DPS the necromancer FIRST, ignore adds.",
      "Library Book Trigger opens the Hidden Passage to Catacombs.",
      "Maze contains Risen Jungle Troll mini-boss before the Ossuary exit.",
      "Ossuary urns are CC traps — opening one wakes 4 skeleton warriors. Open them BEFORE the boss fight."
    ],
    "levels": [
      {
        "id": "tower",
        "name": "The Tower (Entrance)",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "candelabrius",
            "name": "Candelabrius",
            "shape": {
              "kind": "rect",
              "x": 40,
              "y": 6,
              "w": 24,
              "h": 18
            },
            "tone": "hazard"
          },
          {
            "id": "main-corridor",
            "name": "Main Corridor",
            "shape": {
              "kind": "rect",
              "x": 46,
              "y": 24,
              "w": 12,
              "h": 28
            }
          },
          {
            "id": "the-church",
            "name": "The Church",
            "shape": {
              "kind": "rect",
              "x": 38,
              "y": 56,
              "w": 22,
              "h": 10
            }
          },
          {
            "id": "piskan-augur",
            "name": "Piskan Augur",
            "shape": {
              "kind": "rect",
              "x": 10,
              "y": 28,
              "w": 10,
              "h": 10
            },
            "tone": "hazard"
          },
          {
            "id": "the-tower-room",
            "name": "The Tower",
            "shape": {
              "kind": "rect",
              "x": 70,
              "y": 44,
              "w": 18,
              "h": 18
            }
          },
          {
            "id": "the-cemetery",
            "name": "The Cemetery",
            "shape": {
              "kind": "rect",
              "x": 74,
              "y": 76,
              "w": 12,
              "h": 8
            },
            "tone": "hazard"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                52,
                24
              ],
              [
                52,
                56
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                58,
                50
              ],
              [
                70,
                50
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                20,
                33
              ],
              [
                40,
                33
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                79,
                62
              ],
              [
                79,
                76
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              79,
              56
            ],
            "facing": "S",
            "kind": "gate",
            "label": "To Library"
          }
        ],
        "markers": [
          {
            "kind": "altar",
            "at": [
              52,
              14
            ],
            "label": "Candelabrius (altar)"
          },
          {
            "kind": "shrine",
            "at": [
              15,
              33
            ],
            "label": "Piskan Augur"
          },
          {
            "kind": "entrance",
            "at": [
              79,
              53
            ],
            "label": "Tower entrance"
          },
          {
            "kind": "stairs-down",
            "at": [
              82,
              56
            ],
            "label": "To Library"
          }
        ],
        "labels": [
          {
            "at": [
              52,
              4
            ],
            "text": "Candelabrius",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              15,
              25
            ],
            "text": "Piskan Augur",
            "tone": "normal",
            "size": 2
          },
          {
            "at": [
              49,
              70
            ],
            "text": "The Church",
            "tone": "normal",
            "size": 2
          },
          {
            "at": [
              79,
              40
            ],
            "text": "The Tower",
            "tone": "title",
            "size": 2.4
          },
          {
            "at": [
              80,
              88
            ],
            "text": "The Cemetery",
            "tone": "muted",
            "size": 1.8
          }
        ]
      },
      {
        "id": "library",
        "name": "The Library",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "lib-hall",
            "name": "Library Hall",
            "shape": {
              "kind": "rect",
              "x": 8,
              "y": 30,
              "w": 38,
              "h": 50
            }
          },
          {
            "id": "hidden-passage",
            "name": "Hidden Passage to Catacombs",
            "shape": {
              "kind": "rect",
              "x": 30,
              "y": 16,
              "w": 24,
              "h": 8
            },
            "tone": "hazard"
          },
          {
            "id": "lib-mid",
            "name": "Stacks Corridor",
            "shape": {
              "kind": "rect",
              "x": 50,
              "y": 50,
              "w": 16,
              "h": 14
            }
          },
          {
            "id": "observatory",
            "name": "Observatory",
            "shape": {
              "kind": "rect",
              "x": 70,
              "y": 40,
              "w": 22,
              "h": 26
            }
          },
          {
            "id": "obs-annex",
            "name": "Observatory Annex",
            "shape": {
              "kind": "rect",
              "x": 82,
              "y": 18,
              "w": 12,
              "h": 18
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                46,
                55
              ],
              [
                50,
                55
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                66,
                56
              ],
              [
                70,
                56
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                88,
                36
              ],
              [
                88,
                40
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              30,
              20
            ],
            "facing": "W",
            "kind": "secret",
            "label": "Hidden Passage (book trigger)"
          }
        ],
        "markers": [
          {
            "kind": "lever",
            "at": [
              14,
              52
            ],
            "label": "Book Trigger"
          },
          {
            "kind": "trap",
            "at": [
              40,
              20
            ],
            "label": "Hidden Passage to Catacombs"
          },
          {
            "kind": "stairs-down",
            "at": [
              80,
              60
            ],
            "label": "To Catacombs"
          }
        ],
        "labels": [
          {
            "at": [
              25,
              60
            ],
            "text": "Library",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              42,
              12
            ],
            "text": "Hidden Passage to Catacombs",
            "tone": "normal",
            "size": 2
          },
          {
            "at": [
              82,
              72
            ],
            "text": "Observatory",
            "tone": "normal",
            "size": 2.2
          }
        ]
      },
      {
        "id": "catacombs",
        "name": "The Catacombs",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "bridge-room",
            "name": "Bridge Room",
            "shape": {
              "kind": "rect",
              "x": 4,
              "y": 50,
              "w": 14,
              "h": 14
            }
          },
          {
            "id": "spike-trap",
            "name": "Spike Trap Room",
            "shape": {
              "kind": "rect",
              "x": 24,
              "y": 60,
              "w": 12,
              "h": 10
            },
            "tone": "hazard"
          },
          {
            "id": "tupilak-circle",
            "name": "Tupilak Circle",
            "shape": {
              "kind": "rect",
              "x": 46,
              "y": 24,
              "w": 14,
              "h": 14
            },
            "tone": "hazard"
          },
          {
            "id": "frame-painting",
            "name": "Frame Painting",
            "shape": {
              "kind": "rect",
              "x": 72,
              "y": 30,
              "w": 12,
              "h": 10
            }
          },
          {
            "id": "catacombs-exit",
            "name": "Catacombs Exit",
            "shape": {
              "kind": "rect",
              "x": 84,
              "y": 46,
              "w": 12,
              "h": 12
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                18,
                56
              ],
              [
                24,
                64
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                36,
                66
              ],
              [
                50,
                38
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                60,
                30
              ],
              [
                72,
                34
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                78,
                40
              ],
              [
                84,
                50
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              4,
              56
            ],
            "facing": "W",
            "kind": "gate",
            "label": "To the Maze"
          }
        ],
        "markers": [
          {
            "kind": "stairs-up",
            "at": [
              4,
              56
            ],
            "label": "To the Maze"
          },
          {
            "kind": "trap",
            "at": [
              30,
              65
            ],
            "label": "Spike Trap Room"
          },
          {
            "kind": "altar",
            "at": [
              53,
              30
            ],
            "label": "Tupilak Circle"
          },
          {
            "kind": "treasure",
            "at": [
              78,
              34
            ],
            "label": "Frame Painting"
          },
          {
            "kind": "stairs-down",
            "at": [
              90,
              52
            ],
            "label": "To Maze / Catacombs sub-section"
          }
        ],
        "labels": [
          {
            "at": [
              11,
              46
            ],
            "text": "Bridge Room",
            "tone": "normal",
            "size": 2
          },
          {
            "at": [
              30,
              75
            ],
            "text": "Spike Trap Room",
            "tone": "hazard",
            "size": 1.8
          },
          {
            "at": [
              53,
              18
            ],
            "text": "Tupilak Circle",
            "tone": "title",
            "size": 2.2
          },
          {
            "at": [
              78,
              26
            ],
            "text": "Frame Painting",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              4,
              72
            ],
            "text": "To the Maze",
            "tone": "muted",
            "size": 1.8
          }
        ]
      },
      {
        "id": "maze",
        "name": "The Maze",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "maze-nw",
            "name": "NW Approach",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  4,
                  14
                ],
                [
                  22,
                  10
                ],
                [
                  28,
                  28
                ],
                [
                  10,
                  32
                ]
              ]
            }
          },
          {
            "id": "maze-mid",
            "name": "Maze Hub",
            "shape": {
              "kind": "rect",
              "x": 30,
              "y": 30,
              "w": 30,
              "h": 30
            }
          },
          {
            "id": "troll-room",
            "name": "Risen Jungle Troll Lair",
            "shape": {
              "kind": "rect",
              "x": 64,
              "y": 64,
              "w": 24,
              "h": 22
            },
            "tone": "hazard"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                15,
                28
              ],
              [
                30,
                35
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                60,
                50
              ],
              [
                64,
                70
              ]
            ],
            "width": 2.4
          }
        ],
        "doors": [
          {
            "at": [
              4,
              22
            ],
            "facing": "N",
            "kind": "gate",
            "label": "To the Ossuary"
          },
          {
            "at": [
              88,
              84
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Maze Section / next floor"
          }
        ],
        "markers": [
          {
            "kind": "stairs-up",
            "at": [
              4,
              22
            ],
            "label": "To the Ossuary"
          },
          {
            "kind": "boss",
            "at": [
              76,
              74
            ],
            "label": "Risen Jungle Troll (mini-boss)"
          },
          {
            "kind": "stairs-down",
            "at": [
              88,
              84
            ],
            "label": "Maze Section exit"
          }
        ],
        "labels": [
          {
            "at": [
              4,
              38
            ],
            "text": "To the Ossuary",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              40,
              16
            ],
            "text": "The Maze",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              76,
              64
            ],
            "text": "Risen Jungle Troll",
            "tone": "hazard",
            "size": 2
          },
          {
            "at": [
              88,
              92
            ],
            "text": "Maze Section",
            "tone": "muted",
            "size": 1.8
          }
        ]
      },
      {
        "id": "ossuary",
        "name": "The Ossuary",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "oss-entry",
            "name": "Ossuary Entrance",
            "shape": {
              "kind": "rect",
              "x": 40,
              "y": 4,
              "w": 14,
              "h": 16
            }
          },
          {
            "id": "oss-twists",
            "name": "Twisting Corridors",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  20
                ],
                [
                  50,
                  22
                ],
                [
                  52,
                  38
                ],
                [
                  38,
                  40
                ]
              ]
            }
          },
          {
            "id": "boss-room",
            "name": "Boss Room",
            "shape": {
              "kind": "rect",
              "x": 32,
              "y": 48,
              "w": 22,
              "h": 14
            },
            "tone": "hazard"
          },
          {
            "id": "south-junction",
            "name": "South Junction",
            "shape": {
              "kind": "rect",
              "x": 48,
              "y": 68,
              "w": 18,
              "h": 14
            }
          },
          {
            "id": "west-exit",
            "name": "West Exit Corridor",
            "shape": {
              "kind": "rect",
              "x": 8,
              "y": 72,
              "w": 22,
              "h": 6
            }
          },
          {
            "id": "north-exit",
            "name": "North Exit Corridor",
            "shape": {
              "kind": "rect",
              "x": 74,
              "y": 50,
              "w": 6,
              "h": 28
            }
          },
          {
            "id": "south-exit",
            "name": "South Exit",
            "shape": {
              "kind": "rect",
              "x": 54,
              "y": 86,
              "w": 12,
              "h": 8
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                46,
                20
              ],
              [
                46,
                48
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                54,
                56
              ],
              [
                57,
                68
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                30,
                75
              ],
              [
                48,
                75
              ]
            ],
            "width": 2.2
          },
          {
            "points": [
              [
                66,
                75
              ],
              [
                74,
                64
              ]
            ],
            "width": 2
          },
          {
            "points": [
              [
                60,
                82
              ],
              [
                60,
                86
              ]
            ],
            "width": 2
          }
        ],
        "doors": [
          {
            "at": [
              47,
              4
            ],
            "facing": "N",
            "kind": "gate",
            "label": "From Catacombs"
          }
        ],
        "markers": [
          {
            "kind": "entrance",
            "at": [
              47,
              6
            ],
            "label": "Ossuary (from Catacombs)"
          },
          {
            "kind": "boss",
            "at": [
              43,
              54
            ],
            "label": "Necromancer (boss)"
          },
          {
            "kind": "exit",
            "at": [
              8,
              75
            ],
            "label": "West Exit"
          },
          {
            "kind": "exit",
            "at": [
              77,
              50
            ],
            "label": "North Exit"
          },
          {
            "kind": "exit",
            "at": [
              60,
              94
            ],
            "label": "South Exit"
          }
        ],
        "labels": [
          {
            "at": [
              47,
              1
            ],
            "text": "Ossuary",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              43,
              46
            ],
            "text": "Boss Room",
            "tone": "hazard",
            "size": 2.2
          },
          {
            "at": [
              10,
              70
            ],
            "text": "West Exit",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              77,
              47
            ],
            "text": "North Exit",
            "tone": "muted",
            "size": 1.8
          },
          {
            "at": [
              60,
              84
            ],
            "text": "South Exit",
            "tone": "muted",
            "size": 1.8
          }
        ]
      }
    ],
    "sources": [
      "datainfo/dungeonsMyrland/Tower of Decensus - Necro Dungeon -The Tower.png",
      "datainfo/dungeonsMyrland/Tower of Decensus - Necro Dungeon - The Library.png",
      "datainfo/dungeonsMyrland/Tower of Decensus - Necro Dungeon - The Catacombs.png",
      "datainfo/dungeonsMyrland/Tower of Decensus - Necro Dungeon - The Maze.png",
      "datainfo/dungeonsMyrland/Tower of Decensus - Necro Dungeon - The Ossuary.png",
      "Community floor maps owner-supplied 2026-06-26.",
      "https://www.mmorpg.com/news/mortal-online-2-necromancy-update — original 1.0.4 dungeon announcement"
    ]
  },
  {
    "id": "fabernum-tower",
    "name": "Fabernum Tower",
    "region": "Central Myrland — outside Fabernum",
    "difficulty": "Medium",
    "groupSize": "Solo / pair",
    "level": "Low–Mid",
    "summary": "A castle-ruin tower outside Fabernum. One of the first dungeons new players find. Stairs lead down into long corridors of cells. Home of the Grave Keeper. Bandits guard the entry.",
    "mobs": [
      "Bandit (entry)",
      "Grave Keeper (boss)",
      "Moritz (named NPC inside)"
    ],
    "drops": [
      "Grave Keeper loot",
      "Bandit gear"
    ],
    "verified": false,
    "caveats": [
      "Compact dungeon — single short visit clears it. Useful for low-level practice and quick coin runs.",
      "The Custodian is technically a mini-boss; treat as elite."
    ],
    "levels": [
      {
        "id": "surface",
        "name": "Tower Entrance",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "tower-base",
            "name": "Tower Base",
            "shape": {
              "kind": "rect",
              "x": 30,
              "y": 18,
              "w": 24,
              "h": 30
            }
          },
          {
            "id": "entrance-platform",
            "name": "Entrance Platform",
            "shape": {
              "kind": "rect",
              "x": 30,
              "y": 4,
              "w": 24,
              "h": 14
            },
            "tone": "safe"
          },
          {
            "id": "ammo-alcove",
            "name": "Ammunition",
            "shape": {
              "kind": "rect",
              "x": 12,
              "y": 20,
              "w": 14,
              "h": 12
            },
            "tone": "loot"
          },
          {
            "id": "resto-alcove",
            "name": "Restoration",
            "shape": {
              "kind": "rect",
              "x": 12,
              "y": 36,
              "w": 14,
              "h": 12
            },
            "tone": "loot"
          },
          {
            "id": "stair-bay",
            "name": "Stair Bay",
            "shape": {
              "kind": "rect",
              "x": 32,
              "y": 50,
              "w": 20,
              "h": 16
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                42,
                18
              ],
              [
                42,
                4
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                26,
                26
              ],
              [
                30,
                32
              ]
            ]
          },
          {
            "points": [
              [
                26,
                42
              ],
              [
                30,
                36
              ]
            ]
          },
          {
            "points": [
              [
                42,
                48
              ],
              [
                42,
                50
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              42,
              4
            ],
            "facing": "N",
            "kind": "gate",
            "label": "Tower Door"
          }
        ],
        "markers": [
          {
            "at": [
              42,
              10
            ],
            "kind": "entrance",
            "label": "ENTER · Tower Door"
          },
          {
            "at": [
              19,
              26
            ],
            "kind": "vendor",
            "label": "Ammunition"
          },
          {
            "at": [
              19,
              42
            ],
            "kind": "vendor",
            "label": "Restoration"
          },
          {
            "at": [
              42,
              32
            ],
            "kind": "mob",
            "label": "Tower Acolytes ×2"
          },
          {
            "at": [
              42,
              58
            ],
            "kind": "stairs-down",
            "label": "to Dungeon Level 1"
          }
        ],
        "labels": [
          {
            "at": [
              42,
              2
            ],
            "text": "▲ N · ENTRANCE",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              42,
              98
            ],
            "text": "S · stairs down",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "level1",
        "name": "Dungeon Level 1",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "stair-landing",
            "name": "Stair Landing",
            "shape": {
              "kind": "rect",
              "x": 56,
              "y": 8,
              "w": 16,
              "h": 12
            }
          },
          {
            "id": "open-hall",
            "name": "Open Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  12,
                  26
                ],
                [
                  80,
                  26
                ],
                [
                  84,
                  48
                ],
                [
                  68,
                  64
                ],
                [
                  24,
                  64
                ],
                [
                  8,
                  48
                ]
              ]
            }
          },
          {
            "id": "loot-bay",
            "name": "Loot Bay",
            "shape": {
              "kind": "rect",
              "x": 70,
              "y": 64,
              "w": 22,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "stair-down",
            "name": "Down Stair Bay",
            "shape": {
              "kind": "rect",
              "x": 12,
              "y": 70,
              "w": 18,
              "h": 16
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                64,
                20
              ],
              [
                64,
                26
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                70,
                50
              ],
              [
                70,
                64
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                28,
                50
              ],
              [
                22,
                70
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              64,
              8
            ],
            "facing": "N",
            "kind": "door",
            "label": "from Tower Entrance"
          }
        ],
        "markers": [
          {
            "at": [
              64,
              14
            ],
            "kind": "stairs-up",
            "label": "to Tower Entrance"
          },
          {
            "at": [
              40,
              44
            ],
            "kind": "mob",
            "label": "Descent Initiates ×3"
          },
          {
            "at": [
              60,
              38
            ],
            "kind": "mob",
            "label": "Tower Sentry"
          },
          {
            "at": [
              82,
              72
            ],
            "kind": "chest",
            "label": "Loot Bay Chest"
          },
          {
            "at": [
              78,
              76
            ],
            "kind": "loot",
            "label": "Acolyte robes"
          },
          {
            "at": [
              22,
              80
            ],
            "kind": "stairs-down",
            "label": "to Dungeon Level 2"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N · to entrance",
            "tone": "title",
            "size": 2.4
          },
          {
            "at": [
              50,
              98
            ],
            "text": "Dungeon Level 1",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "level2",
        "name": "Dungeon Level 2",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "down-landing",
            "name": "Stair Landing",
            "shape": {
              "kind": "rect",
              "x": 6,
              "y": 4,
              "w": 18,
              "h": 14
            }
          },
          {
            "id": "long-hall",
            "name": "Long Hall",
            "shape": {
              "kind": "rect",
              "x": 6,
              "y": 22,
              "w": 80,
              "h": 28
            }
          },
          {
            "id": "custodian",
            "name": "Custodian's Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  58,
                  52
                ],
                [
                  92,
                  52
                ],
                [
                  96,
                  72
                ],
                [
                  88,
                  86
                ],
                [
                  60,
                  86
                ],
                [
                  54,
                  72
                ]
              ]
            },
            "tone": "miniboss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                15,
                18
              ],
              [
                15,
                22
              ]
            ]
          },
          {
            "points": [
              [
                76,
                50
              ],
              [
                76,
                52
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              15,
              18
            ],
            "facing": "N",
            "kind": "door",
            "label": "from Level 1"
          },
          {
            "at": [
              76,
              52
            ],
            "facing": "N",
            "kind": "door",
            "label": "to Custodian's Hall"
          }
        ],
        "markers": [
          {
            "at": [
              15,
              10
            ],
            "kind": "stairs-up",
            "label": "to Dungeon Level 1"
          },
          {
            "at": [
              30,
              36
            ],
            "kind": "mob",
            "label": "Descent Initiates ×3"
          },
          {
            "at": [
              50,
              36
            ],
            "kind": "mob",
            "label": "Fabermum Clerics ×2"
          },
          {
            "at": [
              66,
              38
            ],
            "kind": "altar",
            "label": "Tower Altar"
          },
          {
            "at": [
              74,
              70
            ],
            "kind": "boss",
            "label": "Tower Custodian (mini-boss)"
          },
          {
            "at": [
              86,
              76
            ],
            "kind": "chest",
            "label": "Custodian Hoard"
          },
          {
            "at": [
              80,
              80
            ],
            "kind": "loot",
            "label": "Descent signet"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N · Custodian east",
            "tone": "title",
            "size": 2.4
          },
          {
            "at": [
              50,
              98
            ],
            "text": "Dungeon Level 2",
            "tone": "muted",
            "size": 2.2
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/16/fabernum-tower/dungeon",
      "https://www.mortalonline2.com/forums/threads/advanced-fabernum-tower-dungeon-map.427/",
      "https://www.youtube.com/watch?v=jWVyY0TwhII (gameplay)"
    ]
  },
  {
    "id": "fabernum-sewers",
    "name": "Fabernum Sewers",
    "region": "Fabernum · sewer network",
    "difficulty": "Medium",
    "groupSize": "Solo / pair",
    "level": "Low-Mid",
    "summary": "Sewer system beneath Fabernum — bandit hideout cells, walking dead in flooded sumps, treasure chests in side passages. Map: community-drawn full-floor SVG (extracted from Claude artifact 2026-06-26).",
    "mobs": [
      "Bandit",
      "Cutthroat",
      "Walking Dead",
      "Sewer Rat"
    ],
    "drops": [
      "Bone Tissue",
      "Stolen goods",
      "Bandit gear (rare)"
    ],
    "verified": false,
    "caveats": [
      "Layout sourced from a community artifact — not in-game measured. Mob list best-effort; ping owner for spot-check."
    ],
    "levels": [
      {
        "id": "sewers",
        "name": "Sewers",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "entry",
            "name": "Entrance",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 4,
              "w": 12,
              "h": 8
            }
          },
          {
            "id": "main",
            "name": "Main Hall",
            "shape": {
              "kind": "rect",
              "x": 26,
              "y": 22,
              "w": 48,
              "h": 36
            }
          }
        ],
        "corridors": [],
        "walls": [],
        "doors": [],
        "markers": [
          {
            "kind": "entrance",
            "at": [
              50,
              6
            ],
            "label": "Sewer Entrance"
          }
        ],
        "labels": []
      }
    ],
    "sources": [
      "datainfo/dungeonsMyrland/Fabernum Sewers/Fabernum Sewers Map.dc.html (inline SVG extracted 2026-06-26)",
      "datainfo/dungeonsMyrland/Fabernum Sewers.png"
    ]
  },
  {
    "id": "tindrem-sewers",
    "name": "Tindrem Sewers",
    "region": "Tindrem · Imperial City",
    "difficulty": "Medium",
    "groupSize": "Solo / pair",
    "level": "Low–Mid",
    "summary": "Drainage labyrinth under the imperial city — three-floor system with a street-grate entrance from the Forum, a flooded cistern, a thieves' guild side cell, a rat warren on the lower deck and a Tindremic Alligator boss in the sluice pit.",
    "mobs": [
      "Bandit Leader (boss)",
      "Illusionist (boss)",
      "Necromancer (boss — drops Necromancer's Heart key item)",
      "Sewer Rat",
      "Cutthroat",
      "Walking Dead"
    ],
    "drops": [
      "Walking Dead Meat (alchemy)",
      "Bone Tissue",
      "Necromancer's Heart (boss)",
      "Stolen goods",
      "Padded Cape (rare from Bandit Leader)"
    ],
    "verified": false,
    "caveats": [
      "Map orientation matches the in-game compass at the Forum entrance (north = uphill).",
      "Cutthroat / Walking Dead spawn cycles vary; the markers show their usual posts."
    ],
    "levels": [
      {
        "id": "surface",
        "name": "Street Level (Forum)",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "forum",
            "name": "Forum Plaza",
            "shape": {
              "kind": "rect",
              "x": 36,
              "y": 4,
              "w": 28,
              "h": 14
            },
            "tone": "safe"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                18
              ],
              [
                50,
                28
              ]
            ],
            "width": 2.4
          }
        ],
        "doors": [
          {
            "at": [
              50,
              18
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Sewer Grate"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              11
            ],
            "kind": "vendor",
            "label": "Forum vendor"
          },
          {
            "at": [
              50,
              18
            ],
            "kind": "entrance",
            "label": "Street Grate · ENTER"
          },
          {
            "at": [
              50,
              28
            ],
            "kind": "stairs-down",
            "label": "to B1"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              1.5
            ],
            "text": "▲ N · Tindrem Forum",
            "tone": "title",
            "size": 3
          }
        ]
      },
      {
        "id": "b1",
        "name": "Upper Drainage (B1)",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "landing",
            "name": "Grate Landing",
            "shape": {
              "kind": "rect",
              "x": 45,
              "y": 6,
              "w": 12,
              "h": 8
            },
            "tone": "safe"
          },
          {
            "id": "junction",
            "name": "Y-Junction",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  42,
                  18
                ],
                [
                  60,
                  18
                ],
                [
                  64,
                  28
                ],
                [
                  38,
                  28
                ]
              ]
            }
          },
          {
            "id": "rat-warren",
            "name": "Rat Warren",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  8,
                  30
                ],
                [
                  28,
                  28
                ],
                [
                  34,
                  42
                ],
                [
                  26,
                  52
                ],
                [
                  12,
                  50
                ],
                [
                  6,
                  40
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "guild-cell",
            "name": "Guild Cell",
            "shape": {
              "kind": "rect",
              "x": 70,
              "y": 22,
              "w": 24,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "cistern",
            "name": "Flooded Cistern",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  46
                ],
                [
                  66,
                  44
                ],
                [
                  72,
                  60
                ],
                [
                  62,
                  72
                ],
                [
                  40,
                  74
                ],
                [
                  30,
                  62
                ]
              ]
            },
            "tone": "hazard"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                51,
                14
              ],
              [
                51,
                18
              ]
            ],
            "width": 2.4
          },
          {
            "points": [
              [
                38,
                28
              ],
              [
                28,
                32
              ]
            ],
            "width": 2.2
          },
          {
            "points": [
              [
                62,
                26
              ],
              [
                70,
                28
              ]
            ],
            "width": 2.2
          },
          {
            "points": [
              [
                51,
                28
              ],
              [
                51,
                46
              ]
            ],
            "width": 2.6
          },
          {
            "points": [
              [
                51,
                72
              ],
              [
                51,
                82
              ]
            ],
            "width": 2.6
          }
        ],
        "walls": [],
        "doors": [
          {
            "at": [
              51,
              14
            ],
            "facing": "N",
            "kind": "gate",
            "label": "from Forum"
          },
          {
            "at": [
              38,
              28
            ],
            "facing": "W",
            "kind": "door"
          },
          {
            "at": [
              62,
              26
            ],
            "facing": "E",
            "kind": "portcullis",
            "label": "Bribed open"
          },
          {
            "at": [
              51,
              46
            ],
            "facing": "S",
            "kind": "door"
          },
          {
            "at": [
              51,
              82
            ],
            "facing": "S",
            "kind": "door",
            "label": "to B2"
          }
        ],
        "markers": [
          {
            "at": [
              51,
              10
            ],
            "kind": "stairs-up",
            "label": "to Forum"
          },
          {
            "at": [
              16,
              38
            ],
            "kind": "mob",
            "label": "Rat pack"
          },
          {
            "at": [
              26,
              46
            ],
            "kind": "elite",
            "label": "Sewer Rat Brute"
          },
          {
            "at": [
              22,
              42
            ],
            "kind": "urn",
            "label": "Urn × 3"
          },
          {
            "at": [
              80,
              30
            ],
            "kind": "mob",
            "label": "Cutthroat × 2"
          },
          {
            "at": [
              88,
              35
            ],
            "kind": "chest",
            "label": "Guild Stash (locked)"
          },
          {
            "at": [
              76,
              36
            ],
            "kind": "lever",
            "label": "Trapdoor lever"
          },
          {
            "at": [
              45,
              58
            ],
            "kind": "trap",
            "label": "Spike pit"
          },
          {
            "at": [
              56,
              62
            ],
            "kind": "mob",
            "label": "Walking Dead × 3"
          },
          {
            "at": [
              62,
              66
            ],
            "kind": "loot",
            "label": "Drowned corpse"
          },
          {
            "at": [
              51,
              82
            ],
            "kind": "stairs-down",
            "label": "to B2 — Sluice Pit"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N",
            "tone": "north",
            "size": 3
          },
          {
            "at": [
              95,
              90
            ],
            "text": "20 m",
            "tone": "muted",
            "size": 2
          }
        ]
      },
      {
        "id": "b2",
        "name": "Sluice Pit (B2)",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "antechamber",
            "name": "Antechamber",
            "shape": {
              "kind": "rect",
              "x": 38,
              "y": 8,
              "w": 24,
              "h": 14
            }
          },
          {
            "id": "western-tunnel",
            "name": "West Tunnel",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  10,
                  28
                ],
                [
                  34,
                  30
                ],
                [
                  34,
                  44
                ],
                [
                  12,
                  44
                ]
              ]
            }
          },
          {
            "id": "eastern-tunnel",
            "name": "East Tunnel",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  66,
                  30
                ],
                [
                  90,
                  28
                ],
                [
                  88,
                  44
                ],
                [
                  66,
                  44
                ]
              ]
            },
            "tone": "loot"
          },
          {
            "id": "pit",
            "name": "Alligator Sluice",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  24,
                  52
                ],
                [
                  76,
                  50
                ],
                [
                  82,
                  72
                ],
                [
                  68,
                  88
                ],
                [
                  32,
                  90
                ],
                [
                  18,
                  72
                ]
              ]
            },
            "tone": "boss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                22
              ],
              [
                50,
                30
              ]
            ]
          },
          {
            "points": [
              [
                40,
                30
              ],
              [
                34,
                36
              ]
            ]
          },
          {
            "points": [
              [
                60,
                30
              ],
              [
                66,
                36
              ]
            ]
          },
          {
            "points": [
              [
                50,
                46
              ],
              [
                50,
                52
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              8
            ],
            "facing": "N",
            "kind": "door",
            "label": "from B1"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              8
            ],
            "kind": "stairs-up",
            "label": "to B1"
          },
          {
            "at": [
              22,
              38
            ],
            "kind": "mob",
            "label": "Walking Dead × 2"
          },
          {
            "at": [
              18,
              42
            ],
            "kind": "urn",
            "label": "Urn (alchemy)"
          },
          {
            "at": [
              82,
              36
            ],
            "kind": "chest",
            "label": "Drowned Chest"
          },
          {
            "at": [
              78,
              40
            ],
            "kind": "loot",
            "label": "Loot pile"
          },
          {
            "at": [
              50,
              70
            ],
            "kind": "boss",
            "label": "Tindremic Alligator (BOSS)"
          },
          {
            "at": [
              38,
              78
            ],
            "kind": "trap",
            "label": "Sluice gate (drowns AFK)"
          },
          {
            "at": [
              64,
              78
            ],
            "kind": "lever",
            "label": "Drain lever"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              3
            ],
            "text": "▲ N",
            "tone": "north",
            "size": 3
          },
          {
            "at": [
              50,
              64
            ],
            "text": "BOSS · Sluice Pit",
            "tone": "hazard",
            "size": 2.6
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/853/tindrem-sewers/dungeon",
      "https://www.youtube.com/watch?v=MvhFkCroE2A (Bandit Leader boss)",
      "https://m.youtube.com/watch?v=syRS34bwk3c (Illusionist boss)"
    ]
  },
  {
    "id": "risar-dungeon",
    "name": "GK Risar Dungeon",
    "region": "Gaul Kor — NE Myrland",
    "difficulty": "Medium",
    "groupSize": "Solo / pair",
    "level": "Mid",
    "summary": "Underground Risar (orc-like) camp in Gaul Kor in the north-east of Myrland. End boss is the Risar Chieftain (a Pit Boss, drops a 100% Ruby). Risar mobs throw stones for 30-40 damage. There are multiple Risar locations on Myrland; this is the canonical \"GK Risar Dungeon\" entry.",
    "mobs": [
      "Risar",
      "Risar Veteran",
      "Risar Chieftain (Pit Boss — 100% Ruby drop)"
    ],
    "drops": [
      "Ruby (Risar Chieftain, 100% drop)",
      "Risar weapons / loot bags"
    ],
    "verified": false,
    "caveats": [
      "Multiple Risar Encampments exist across the map — layout shown is the canonical 'Ironhold' camp.",
      "Patrol routes change between server resets; the markers show typical posts."
    ],
    "levels": [
      {
        "id": "fort",
        "name": "Outer Fort",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "palisade",
            "name": "Palisade Yard",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  8,
                  18
                ],
                [
                  92,
                  18
                ],
                [
                  92,
                  76
                ],
                [
                  60,
                  90
                ],
                [
                  40,
                  90
                ],
                [
                  8,
                  76
                ]
              ]
            }
          },
          {
            "id": "barracks",
            "name": "Barracks",
            "shape": {
              "kind": "rect",
              "x": 64,
              "y": 30,
              "w": 22,
              "h": 18
            }
          },
          {
            "id": "smithy",
            "name": "Smithy",
            "shape": {
              "kind": "rect",
              "x": 14,
              "y": 30,
              "w": 18,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "totem",
            "name": "Totem Court",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  40,
                  40
                ],
                [
                  60,
                  40
                ],
                [
                  64,
                  60
                ],
                [
                  50,
                  68
                ],
                [
                  36,
                  60
                ]
              ]
            },
            "tone": "hazard"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                90
              ],
              [
                50,
                76
              ]
            ],
            "width": 4
          },
          {
            "points": [
              [
                50,
                76
              ],
              [
                50,
                68
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                50,
                40
              ],
              [
                50,
                24
              ]
            ],
            "width": 3
          }
        ],
        "walls": [
          {
            "points": [
              [
                8,
                18
              ],
              [
                92,
                18
              ]
            ]
          },
          {
            "points": [
              [
                8,
                76
              ],
              [
                40,
                90
              ]
            ]
          },
          {
            "points": [
              [
                60,
                90
              ],
              [
                92,
                76
              ]
            ]
          },
          {
            "points": [
              [
                8,
                18
              ],
              [
                8,
                76
              ]
            ]
          },
          {
            "points": [
              [
                92,
                18
              ],
              [
                92,
                76
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              90
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Main Gate (palisade)"
          },
          {
            "at": [
              50,
              18
            ],
            "facing": "N",
            "kind": "gate",
            "label": "Cave Mouth"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              90
            ],
            "kind": "entrance",
            "label": "ENTER · Main Gate"
          },
          {
            "at": [
              50,
              85
            ],
            "kind": "mob",
            "label": "Gate Lookouts ×2"
          },
          {
            "at": [
              25,
              38
            ],
            "kind": "mob",
            "label": "Smith + Hunter"
          },
          {
            "at": [
              22,
              42
            ],
            "kind": "urn",
            "label": "Smithy crates"
          },
          {
            "at": [
              28,
              44
            ],
            "kind": "chest",
            "label": "Smithy Locker"
          },
          {
            "at": [
              75,
              36
            ],
            "kind": "mob",
            "label": "Sleeping Berserkers ×3"
          },
          {
            "at": [
              80,
              42
            ],
            "kind": "loot",
            "label": "Weapon rack"
          },
          {
            "at": [
              50,
              50
            ],
            "kind": "altar",
            "label": "War Totem"
          },
          {
            "at": [
              50,
              50
            ],
            "kind": "mob",
            "label": "Risar Shaman"
          },
          {
            "at": [
              44,
              56
            ],
            "kind": "campfire",
            "label": "Camp fire"
          },
          {
            "at": [
              56,
              56
            ],
            "kind": "campfire",
            "label": "Camp fire"
          },
          {
            "at": [
              50,
              18
            ],
            "kind": "stairs-up",
            "label": "to Cave (north)"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              4
            ],
            "text": "▲ N · Cave Mouth",
            "tone": "title",
            "size": 3
          },
          {
            "at": [
              50,
              96
            ],
            "text": "S · Main Gate",
            "tone": "muted",
            "size": 2.4
          },
          {
            "at": [
              3,
              50
            ],
            "text": "W",
            "tone": "muted",
            "size": 3
          },
          {
            "at": [
              97,
              50
            ],
            "text": "E",
            "tone": "muted",
            "size": 3
          }
        ]
      },
      {
        "id": "cave",
        "name": "Chieftain's Cave",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "entry",
            "name": "Cave Mouth",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 78,
              "w": 16,
              "h": 14
            }
          },
          {
            "id": "vestibule",
            "name": "Vestibule",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  58
                ],
                [
                  66,
                  58
                ],
                [
                  64,
                  76
                ],
                [
                  36,
                  76
                ]
              ]
            }
          },
          {
            "id": "shaman-alcove",
            "name": "Shaman Alcove",
            "shape": {
              "kind": "rect",
              "x": 12,
              "y": 44,
              "w": 16,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "war-armoury",
            "name": "War Armoury",
            "shape": {
              "kind": "rect",
              "x": 72,
              "y": 44,
              "w": 16,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "war-altar",
            "name": "War Altar",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  28,
                  12
                ],
                [
                  72,
                  12
                ],
                [
                  80,
                  30
                ],
                [
                  68,
                  42
                ],
                [
                  32,
                  42
                ],
                [
                  20,
                  30
                ]
              ]
            },
            "tone": "boss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                78
              ],
              [
                50,
                58
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                34,
                66
              ],
              [
                28,
                60
              ]
            ]
          },
          {
            "points": [
              [
                66,
                66
              ],
              [
                72,
                60
              ]
            ]
          },
          {
            "points": [
              [
                50,
                58
              ],
              [
                50,
                42
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              50,
              78
            ],
            "facing": "S",
            "kind": "gate",
            "label": "from Fort"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              84
            ],
            "kind": "stairs-down",
            "label": "to Fort (south)"
          },
          {
            "at": [
              50,
              68
            ],
            "kind": "mob",
            "label": "Risar Hunters ×2"
          },
          {
            "at": [
              20,
              52
            ],
            "kind": "mob",
            "label": "Shaman + apprentice"
          },
          {
            "at": [
              18,
              56
            ],
            "kind": "chest",
            "label": "Spell Cache"
          },
          {
            "at": [
              80,
              52
            ],
            "kind": "mob",
            "label": "Berserker pair"
          },
          {
            "at": [
              80,
              56
            ],
            "kind": "loot",
            "label": "Armour stand"
          },
          {
            "at": [
              83,
              50
            ],
            "kind": "chest",
            "label": "Wrapped Weapons"
          },
          {
            "at": [
              50,
              26
            ],
            "kind": "boss",
            "label": "Risar Chieftain (BOSS)"
          },
          {
            "at": [
              50,
              32
            ],
            "kind": "altar",
            "label": "War Altar (skull totem)"
          },
          {
            "at": [
              36,
              22
            ],
            "kind": "urn",
            "label": "Ritual urn"
          },
          {
            "at": [
              64,
              22
            ],
            "kind": "urn",
            "label": "Ritual urn"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              4
            ],
            "text": "▲ N · War Altar",
            "tone": "title",
            "size": 3
          },
          {
            "at": [
              50,
              96
            ],
            "text": "S · to Fort",
            "tone": "muted",
            "size": 2.4
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/50/gk-risar-dungeon/dungeon",
      "https://www.youtube.com/watch?v=ANofajPQIxE (Risar Dungeon Tour)"
    ]
  },
  {
    "id": "spider-caves",
    "name": "Spider Cave (Spider Valley)",
    "region": "Spider Valley — Eastern Steppe (one of multiple Spider Caves in Myrland)",
    "difficulty": "Medium",
    "groupSize": "Solo / pair",
    "level": "Low–Mid",
    "summary": "Outdoor / shallow-cave spider lair in Spider Valley on the eastern steppe. Easy starter content — community reports clearing them with a torch. Multiple Spider Caves exist across Myrland (this entry refers to the Spider Valley one); others are at Tephra Crater and near the Minotaur Dungeon, with Spider Queen rooms scattered through them.",
    "mobs": [
      "Spider (generic, low damage)",
      "Mountain Spider (separate creature)",
      "Spider Queen (in some caves)"
    ],
    "drops": [
      "Spider Bile",
      "Web Sacks",
      "Bloodsilk (rare, Spider Queen)"
    ],
    "verified": false,
    "caveats": [
      "The 'webbed shaft' is a one-way drop unless you bring a ladder/rope.",
      "Egg nests respawn the swarm — clear them on the way IN if you want a clean exit."
    ],
    "levels": [
      {
        "id": "upper",
        "name": "Upper Warren",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "fissure",
            "name": "Cave Fissure",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 84,
              "w": 12,
              "h": 12
            }
          },
          {
            "id": "webbed-hall",
            "name": "Webbed Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  28,
                  58
                ],
                [
                  72,
                  58
                ],
                [
                  64,
                  80
                ],
                [
                  36,
                  80
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "egg-nest-w",
            "name": "Egg Nest (W)",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  8,
                  40
                ],
                [
                  28,
                  40
                ],
                [
                  28,
                  58
                ],
                [
                  10,
                  58
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "egg-nest-e",
            "name": "Egg Nest (E)",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  72,
                  40
                ],
                [
                  92,
                  40
                ],
                [
                  90,
                  58
                ],
                [
                  72,
                  58
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "silk-tunnel",
            "name": "Silk Tunnel",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  18
                ],
                [
                  66,
                  18
                ],
                [
                  66,
                  42
                ],
                [
                  34,
                  42
                ]
              ]
            }
          },
          {
            "id": "shaft",
            "name": "Webbed Shaft (drop)",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 6,
              "w": 12,
              "h": 10
            },
            "tone": "hazard"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                84
              ],
              [
                50,
                80
              ]
            ]
          },
          {
            "points": [
              [
                36,
                70
              ],
              [
                28,
                50
              ]
            ]
          },
          {
            "points": [
              [
                64,
                70
              ],
              [
                72,
                50
              ]
            ]
          },
          {
            "points": [
              [
                50,
                58
              ],
              [
                50,
                42
              ]
            ]
          },
          {
            "points": [
              [
                50,
                18
              ],
              [
                50,
                16
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              84
            ],
            "facing": "S",
            "kind": "door",
            "label": "Cave Mouth"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              92
            ],
            "kind": "entrance",
            "label": "ENTER"
          },
          {
            "at": [
              50,
              70
            ],
            "kind": "mob",
            "label": "Spider × 2"
          },
          {
            "at": [
              18,
              48
            ],
            "kind": "mob",
            "label": "Spiderlings ×6"
          },
          {
            "at": [
              16,
              52
            ],
            "kind": "urn",
            "label": "Egg sacs (alchemy)"
          },
          {
            "at": [
              82,
              48
            ],
            "kind": "mob",
            "label": "Sentinel Spider"
          },
          {
            "at": [
              82,
              54
            ],
            "kind": "loot",
            "label": "Cocooned corpse"
          },
          {
            "at": [
              50,
              28
            ],
            "kind": "mob",
            "label": "Bloodsilk Spider"
          },
          {
            "at": [
              44,
              32
            ],
            "kind": "chest",
            "label": "Adventurer's Pack"
          },
          {
            "at": [
              50,
              11
            ],
            "kind": "stairs-down",
            "label": "Webbed Shaft (one-way)"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              3
            ],
            "text": "▲ N · Shaft down",
            "tone": "title",
            "size": 3
          },
          {
            "at": [
              50,
              99
            ],
            "text": "S · ENTRANCE",
            "tone": "muted",
            "size": 2.4
          }
        ]
      },
      {
        "id": "lower",
        "name": "Queen's Brood Chamber",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "landing",
            "name": "Shaft Landing",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 78,
              "w": 12,
              "h": 10
            }
          },
          {
            "id": "fungal-passage",
            "name": "Fungal Passage",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  30,
                  54
                ],
                [
                  70,
                  54
                ],
                [
                  66,
                  74
                ],
                [
                  34,
                  74
                ]
              ]
            }
          },
          {
            "id": "brood-pit",
            "name": "Brood Pit",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  16,
                  18
                ],
                [
                  84,
                  18
                ],
                [
                  88,
                  42
                ],
                [
                  78,
                  54
                ],
                [
                  22,
                  54
                ],
                [
                  12,
                  42
                ]
              ]
            },
            "tone": "boss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                78
              ],
              [
                50,
                74
              ]
            ]
          },
          {
            "points": [
              [
                50,
                54
              ],
              [
                50,
                42
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              78
            ],
            "facing": "S",
            "kind": "door",
            "label": "from shaft"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              82
            ],
            "kind": "ladder",
            "label": "Rope ladder back up"
          },
          {
            "at": [
              50,
              64
            ],
            "kind": "mob",
            "label": "Spiderlings ×8"
          },
          {
            "at": [
              38,
              64
            ],
            "kind": "trap",
            "label": "Web snare"
          },
          {
            "at": [
              50,
              30
            ],
            "kind": "boss",
            "label": "Spider Queen (BOSS)"
          },
          {
            "at": [
              24,
              28
            ],
            "kind": "loot",
            "label": "Mummified caravan"
          },
          {
            "at": [
              76,
              28
            ],
            "kind": "chest",
            "label": "Queen's Hoard"
          },
          {
            "at": [
              50,
              38
            ],
            "kind": "urn",
            "label": "Bloodsilk bolts"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              3
            ],
            "text": "▲ N · Queen",
            "tone": "title",
            "size": 3
          },
          {
            "at": [
              50,
              99
            ],
            "text": "S · Ladder up",
            "tone": "muted",
            "size": 2.4
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/280/spider-valley/spider-cave",
      "https://www.mortalonlinemap.info/308/spider-cave/tephra-crater",
      "https://mortalonline2.com/forums/threads/spider-caves.2164/"
    ]
  },
  {
    "id": "minotaur-dungeon",
    "name": "Minotaur Dungeon",
    "region": "Mouth of Gal Barag — NE of Fabernum Tower",
    "difficulty": "Hard",
    "groupSize": "Group (3–6)",
    "level": "Mid–High",
    "summary": "One of the original PvE dungeons in MO2. Set inside the Mouth of Gal Barag, north-east of Fabernum Tower. End boss is the Minotaur King (community-canonical name — sometimes called \"Labyrinth King\" colloquially but the real name is Minotaur King). Generic Minotaurs + Minotaur Guards spawn through the floors. One of the Spider Queen rooms (separate dungeon system) also lives nearby.",
    "mobs": [
      "Minotaur (generic)",
      "Minotaur Guard",
      "Minotaur King (boss)"
    ],
    "drops": [
      "Minotaur Horn",
      "Minotaur Hide",
      "Bone Tissue"
    ],
    "verified": false,
    "caveats": [
      "The four arms loop — watch your compass or you'll re-enter the south arm thinking it's the north."
    ],
    "levels": [
      {
        "id": "maze",
        "name": "Labyrinth Floor",
        "orientation": "north-up",
        "metresPerUnit": 3,
        "rooms": [
          {
            "id": "gate",
            "name": "Stone Gate",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 84,
              "w": 16,
              "h": 10
            }
          },
          {
            "id": "atrium",
            "name": "Central Atrium",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  36,
                  40
                ],
                [
                  64,
                  40
                ],
                [
                  64,
                  60
                ],
                [
                  36,
                  60
                ]
              ]
            }
          },
          {
            "id": "arm-w",
            "name": "West Arm",
            "shape": {
              "kind": "rect",
              "x": 4,
              "y": 44,
              "w": 30,
              "h": 12
            }
          },
          {
            "id": "arm-e",
            "name": "East Arm",
            "shape": {
              "kind": "rect",
              "x": 66,
              "y": 44,
              "w": 30,
              "h": 12
            }
          },
          {
            "id": "arm-s",
            "name": "South Arm",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 62,
              "w": 12,
              "h": 22
            }
          },
          {
            "id": "arm-n",
            "name": "North Arm",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 14,
              "w": 12,
              "h": 26
            }
          },
          {
            "id": "kings-hall",
            "name": "King's Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  60,
                  2
                ],
                [
                  92,
                  2
                ],
                [
                  96,
                  18
                ],
                [
                  80,
                  30
                ],
                [
                  60,
                  26
                ]
              ]
            },
            "tone": "boss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                84
              ],
              [
                50,
                60
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                36,
                50
              ],
              [
                34,
                50
              ]
            ]
          },
          {
            "points": [
              [
                64,
                50
              ],
              [
                66,
                50
              ]
            ]
          },
          {
            "points": [
              [
                50,
                40
              ],
              [
                50,
                30
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                56,
                14
              ],
              [
                70,
                14
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              84
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Stone Gate"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              92
            ],
            "kind": "entrance",
            "label": "ENTER"
          },
          {
            "at": [
              18,
              50
            ],
            "kind": "mob",
            "label": "Minotaur Calf × 2"
          },
          {
            "at": [
              16,
              52
            ],
            "kind": "urn",
            "label": "Horn pile"
          },
          {
            "at": [
              82,
              50
            ],
            "kind": "mob",
            "label": "Minotaur Warrior × 2"
          },
          {
            "at": [
              82,
              54
            ],
            "kind": "loot",
            "label": "Bone heap"
          },
          {
            "at": [
              50,
              50
            ],
            "kind": "mob",
            "label": "Minotaur Champion"
          },
          {
            "at": [
              50,
              70
            ],
            "kind": "mob",
            "label": "Minotaur Warrior"
          },
          {
            "at": [
              50,
              20
            ],
            "kind": "mob",
            "label": "Minotaur Champion"
          },
          {
            "at": [
              44,
              24
            ],
            "kind": "chest",
            "label": "Wrapped Greataxe"
          },
          {
            "at": [
              80,
              14
            ],
            "kind": "boss",
            "label": "Labyrinth King (BOSS)"
          },
          {
            "at": [
              88,
              12
            ],
            "kind": "loot",
            "label": "Royal carcass (rare)"
          },
          {
            "at": [
              70,
              20
            ],
            "kind": "altar",
            "label": "Bull Skull Altar"
          }
        ],
        "labels": [
          {
            "at": [
              78,
              1.5
            ],
            "text": "▲ NE · King's Hall",
            "tone": "title",
            "size": 2.8
          },
          {
            "at": [
              50,
              99
            ],
            "text": "S · ENTRANCE",
            "tone": "muted",
            "size": 2.4
          },
          {
            "at": [
              3,
              50
            ],
            "text": "W",
            "tone": "muted",
            "size": 3
          },
          {
            "at": [
              97,
              50
            ],
            "text": "E",
            "tone": "muted",
            "size": 3
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/17/minotaur-dungeon/dungeon",
      "https://www.mmorpg.com/news/mortal-online-2-receives-minotaur-king-2000123380",
      "https://www.youtube.com/watch?v=A6exIrzpgbQ (gameplay tutorial)"
    ]
  },
  {
    "id": "bandit-camp",
    "name": "Bandit Camp",
    "region": "Myrland (multiple instances — Bakti, Spider Cave, Northern Steppe, HQ)",
    "difficulty": "Easy",
    "groupSize": "Solo",
    "level": "Starter",
    "summary": "Generic outdoor bandit hideouts scattered across Myrland — Bakti Bandit Camp, Spider Cave Bandit Camp, Northern Steppe Bandit Camp, Headquarters Bandit Camp. Low-level starter content. End mob is a Bandit Leader (sometimes drops a rare green Kallardian padded cape).",
    "mobs": [
      "Bandit (generic)",
      "Bandit Leader (boss — rare cape drop)"
    ],
    "drops": [
      "Bandit loot bags",
      "Green Kallardian Padded Cape (rare, Bandit Leader)"
    ],
    "verified": false,
    "caveats": [
      "Layout is the canonical single-cave template — Myrland has 7+ near-identical instances."
    ],
    "levels": [
      {
        "id": "cave",
        "name": "Cave Interior",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "mouth",
            "name": "Cave Mouth",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 78,
              "w": 16,
              "h": 14
            }
          },
          {
            "id": "main",
            "name": "Main Chamber",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  20,
                  40
                ],
                [
                  80,
                  40
                ],
                [
                  78,
                  72
                ],
                [
                  22,
                  72
                ]
              ]
            }
          },
          {
            "id": "stash",
            "name": "Stash",
            "shape": {
              "kind": "rect",
              "x": 8,
              "y": 22,
              "w": 22,
              "h": 14
            },
            "tone": "loot"
          },
          {
            "id": "captain",
            "name": "Captain's Nook",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  62,
                  12
                ],
                [
                  92,
                  12
                ],
                [
                  90,
                  32
                ],
                [
                  72,
                  38
                ],
                [
                  60,
                  30
                ]
              ]
            },
            "tone": "boss"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                78
              ],
              [
                50,
                72
              ]
            ]
          },
          {
            "points": [
              [
                30,
                50
              ],
              [
                22,
                36
              ]
            ]
          },
          {
            "points": [
              [
                70,
                50
              ],
              [
                78,
                30
              ]
            ]
          }
        ],
        "doors": [
          {
            "at": [
              50,
              78
            ],
            "facing": "S",
            "kind": "door",
            "label": "Cave Mouth"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              86
            ],
            "kind": "entrance",
            "label": "ENTER"
          },
          {
            "at": [
              40,
              58
            ],
            "kind": "mob",
            "label": "Brawlers × 2"
          },
          {
            "at": [
              60,
              58
            ],
            "kind": "mob",
            "label": "Lookout"
          },
          {
            "at": [
              44,
              64
            ],
            "kind": "campfire",
            "label": "Camp fire"
          },
          {
            "at": [
              16,
              30
            ],
            "kind": "chest",
            "label": "Stash Chest"
          },
          {
            "at": [
              24,
              32
            ],
            "kind": "loot",
            "label": "Coin pouch"
          },
          {
            "at": [
              78,
              22
            ],
            "kind": "boss",
            "label": "Bandit Captain (BOSS)"
          },
          {
            "at": [
              86,
              22
            ],
            "kind": "loot",
            "label": "Boss drop"
          }
        ],
        "labels": [
          {
            "at": [
              80,
              4
            ],
            "text": "▲ NE · Captain",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              50,
              99
            ],
            "text": "S · Cave Mouth",
            "tone": "muted",
            "size": 2.4
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/281/spider-cave/bandit-camp",
      "https://www.mortalonlinemap.info/247/bakti/bandit-camp",
      "https://mortalonline2.com/forums/threads/pomeh-indigo-adventures.5120/page-3"
    ]
  },
  {
    "id": "sator-dungeon",
    "name": "Sator Dungeon",
    "region": "Myrland · Sator Coast",
    "difficulty": "Hard",
    "groupSize": "Group (3–6)",
    "level": "Mid–High",
    "summary": "Major endgame dungeon near Bakti / Morin Khur (~1h30 ride from Morin Khur). The end-boss encounter requires 10+ players. Completing the dungeon unlocks Spiritism. Heavily contested PvP/PvE site. Bosses include The Vessel and Sator Elder; Nightmare Mage is a named encounter inside.",
    "mobs": [
      "Sator (generic)",
      "The Vessel (boss)",
      "Sator Elder (boss)",
      "Nightmare Mage (named encounter)"
    ],
    "drops": [
      "Spiritism unlock (boss kill)",
      "Sator-specific reagents"
    ],
    "verified": false,
    "caveats": [
      "Floor numbering follows the community hand-drawn map: enter from the south (Lower Entrance, sea side) or from the Eldersator alcove to the north (Upper Entrance).",
      "The Vessel chamber across the chasm is reached by a one-way jump from 6th Floor — bring rope/levitate or accept the fall.",
      "Elder Sator is a rare spawn in the brown alcove above Upper Entrance; do not engage without a group."
    ],
    "levels": [
      {
        "id": "bottom",
        "name": "Bottom Floor",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "pit-hall",
            "name": "Pit Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  18,
                  22
                ],
                [
                  82,
                  22
                ],
                [
                  88,
                  40
                ],
                [
                  82,
                  72
                ],
                [
                  64,
                  86
                ],
                [
                  36,
                  86
                ],
                [
                  18,
                  72
                ],
                [
                  12,
                  40
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "pit",
            "name": "The Pit",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  36,
                  40
                ],
                [
                  64,
                  40
                ],
                [
                  68,
                  54
                ],
                [
                  60,
                  68
                ],
                [
                  40,
                  68
                ],
                [
                  32,
                  54
                ]
              ]
            },
            "tone": "boss"
          },
          {
            "id": "west-alcove",
            "name": "West Alcove",
            "shape": {
              "kind": "rect",
              "x": 4,
              "y": 44,
              "w": 14,
              "h": 16
            },
            "tone": "loot"
          },
          {
            "id": "east-alcove",
            "name": "East Alcove",
            "shape": {
              "kind": "rect",
              "x": 82,
              "y": 44,
              "w": 14,
              "h": 16
            },
            "tone": "loot"
          }
        ],
        "corridors": [
          {
            "points": [
              [
                18,
                52
              ],
              [
                4,
                52
              ]
            ]
          },
          {
            "points": [
              [
                82,
                52
              ],
              [
                96,
                52
              ]
            ]
          },
          {
            "points": [
              [
                50,
                12
              ],
              [
                50,
                22
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              50,
              22
            ],
            "facing": "N",
            "kind": "door",
            "label": "stairs to 2nd"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              14
            ],
            "kind": "stairs-up",
            "label": "to 2nd Floor"
          },
          {
            "at": [
              50,
              54
            ],
            "kind": "trap",
            "label": "The Pit",
            "notes": "Drops 4 floors down into a sealed cell. Carry rope to climb out."
          },
          {
            "at": [
              42,
              62
            ],
            "kind": "mob",
            "label": "Sator Workers ×3"
          },
          {
            "at": [
              58,
              62
            ],
            "kind": "mob",
            "label": "Sator Workers ×3"
          },
          {
            "at": [
              50,
              80
            ],
            "kind": "mob",
            "label": "Sator Warrior"
          },
          {
            "at": [
              11,
              52
            ],
            "kind": "chest",
            "label": "Brood Cache"
          },
          {
            "at": [
              89,
              52
            ],
            "kind": "chest",
            "label": "Brood Cache"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              6
            ],
            "text": "▲ N · stairs up",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              50,
              96
            ],
            "text": "Bottom Floor",
            "tone": "muted",
            "size": 2.4
          }
        ]
      },
      {
        "id": "second",
        "name": "2nd Floor",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "west-chamber",
            "name": "West Chamber",
            "shape": {
              "kind": "rect",
              "x": 10,
              "y": 26,
              "w": 30,
              "h": 26
            }
          },
          {
            "id": "east-chamber",
            "name": "East Chamber",
            "shape": {
              "kind": "rect",
              "x": 60,
              "y": 26,
              "w": 30,
              "h": 26
            }
          },
          {
            "id": "south-link",
            "name": "South Link",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 64,
              "w": 16,
              "h": 14
            }
          },
          {
            "id": "north-link",
            "name": "North Link",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 6,
              "w": 16,
              "h": 14
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                40,
                39
              ],
              [
                60,
                39
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                50,
                20
              ],
              [
                50,
                26
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                50,
                52
              ],
              [
                50,
                64
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              40,
              39
            ],
            "facing": "W",
            "kind": "door"
          },
          {
            "at": [
              60,
              39
            ],
            "facing": "E",
            "kind": "door"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              12
            ],
            "kind": "stairs-up",
            "label": "to Lower Entrance"
          },
          {
            "at": [
              50,
              72
            ],
            "kind": "stairs-down",
            "label": "to Bottom Floor"
          },
          {
            "at": [
              22,
              36
            ],
            "kind": "mob",
            "label": "Sator Warriors ×2"
          },
          {
            "at": [
              78,
              36
            ],
            "kind": "mob",
            "label": "Sator Spitters ×2"
          },
          {
            "at": [
              16,
              46
            ],
            "kind": "urn",
            "label": "Egg pile"
          },
          {
            "at": [
              84,
              46
            ],
            "kind": "urn",
            "label": "Egg pile"
          },
          {
            "at": [
              34,
              30
            ],
            "kind": "loot",
            "label": "Sator carcass"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N",
            "tone": "north",
            "size": 2.6
          },
          {
            "at": [
              50,
              96
            ],
            "text": "2nd Floor (brown)",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "lower-entrance",
        "name": "Lower Entrance",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "beach-arch",
            "name": "Beach Archway",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 82,
              "w": 16,
              "h": 14
            },
            "tone": "safe"
          },
          {
            "id": "great-hall",
            "name": "Great Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  20,
                  46
                ],
                [
                  80,
                  46
                ],
                [
                  80,
                  80
                ],
                [
                  20,
                  80
                ]
              ]
            }
          },
          {
            "id": "altar-platform",
            "name": "Altar Platform",
            "shape": {
              "kind": "rect",
              "x": 38,
              "y": 58,
              "w": 24,
              "h": 12
            },
            "tone": "hazard"
          },
          {
            "id": "stair-vestibule",
            "name": "Stair Vestibule",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 24,
              "w": 16,
              "h": 16
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                82
              ],
              [
                50,
                80
              ]
            ],
            "width": 4
          },
          {
            "points": [
              [
                50,
                46
              ],
              [
                50,
                40
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              50,
              82
            ],
            "facing": "S",
            "kind": "gate",
            "label": "Beach Archway (sea)"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              92
            ],
            "kind": "entrance",
            "label": "ENTER · Sea",
            "notes": "Entry from the beach at low tide. The arch is partly submerged — swim through at high water."
          },
          {
            "at": [
              50,
              64
            ],
            "kind": "altar",
            "label": "Sator Altar",
            "notes": "Glowing rune brazier. Triggers a wave when interacted with — do NOT touch unless ready to fight."
          },
          {
            "at": [
              30,
              72
            ],
            "kind": "mob",
            "label": "Sator Workers ×4"
          },
          {
            "at": [
              70,
              72
            ],
            "kind": "mob",
            "label": "Sator Workers ×4"
          },
          {
            "at": [
              40,
              50
            ],
            "kind": "mob",
            "label": "Sator Warrior"
          },
          {
            "at": [
              60,
              50
            ],
            "kind": "mob",
            "label": "Sator Warrior"
          },
          {
            "at": [
              50,
              32
            ],
            "kind": "stairs-up",
            "label": "to 4th Floor"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N · stairs up",
            "tone": "title",
            "size": 2.8
          },
          {
            "at": [
              50,
              99
            ],
            "text": "S · SEA ENTRANCE",
            "tone": "muted",
            "size": 2.4
          }
        ]
      },
      {
        "id": "fourth",
        "name": "4th Floor",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "hub",
            "name": "Hub Chamber",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  36,
                  36
                ],
                [
                  64,
                  36
                ],
                [
                  64,
                  64
                ],
                [
                  36,
                  64
                ]
              ]
            }
          },
          {
            "id": "west-wing",
            "name": "West Wing",
            "shape": {
              "kind": "rect",
              "x": 6,
              "y": 42,
              "w": 28,
              "h": 16
            }
          },
          {
            "id": "east-wing",
            "name": "East Wing",
            "shape": {
              "kind": "rect",
              "x": 66,
              "y": 42,
              "w": 28,
              "h": 16
            }
          },
          {
            "id": "north-spur",
            "name": "North Spur",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 8,
              "w": 12,
              "h": 28
            }
          },
          {
            "id": "south-spur",
            "name": "South Spur",
            "shape": {
              "kind": "rect",
              "x": 44,
              "y": 64,
              "w": 12,
              "h": 28
            }
          }
        ],
        "corridors": [],
        "doors": [
          {
            "at": [
              36,
              50
            ],
            "facing": "W",
            "kind": "door"
          },
          {
            "at": [
              64,
              50
            ],
            "facing": "E",
            "kind": "door"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              14
            ],
            "kind": "stairs-up",
            "label": "to 5th Floor"
          },
          {
            "at": [
              50,
              86
            ],
            "kind": "stairs-down",
            "label": "to Lower Entrance"
          },
          {
            "at": [
              50,
              50
            ],
            "kind": "mob",
            "label": "Sator Drones ×4"
          },
          {
            "at": [
              16,
              50
            ],
            "kind": "chest",
            "label": "West Cache"
          },
          {
            "at": [
              84,
              50
            ],
            "kind": "chest",
            "label": "East Cache"
          },
          {
            "at": [
              22,
              50
            ],
            "kind": "mob",
            "label": "Sator Spitter"
          },
          {
            "at": [
              78,
              50
            ],
            "kind": "mob",
            "label": "Sator Spitter"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N",
            "tone": "north",
            "size": 2.6
          },
          {
            "at": [
              50,
              98
            ],
            "text": "4th Floor (cyan)",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "fifth",
        "name": "5th Floor",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "west-loot",
            "name": "West Loot Room",
            "shape": {
              "kind": "rect",
              "x": 4,
              "y": 36,
              "w": 22,
              "h": 22
            },
            "tone": "loot"
          },
          {
            "id": "long-hall",
            "name": "Long Hall",
            "shape": {
              "kind": "rect",
              "x": 26,
              "y": 42,
              "w": 48,
              "h": 12
            }
          },
          {
            "id": "east-loot",
            "name": "East Loot Room",
            "shape": {
              "kind": "rect",
              "x": 74,
              "y": 36,
              "w": 22,
              "h": 22
            },
            "tone": "loot"
          },
          {
            "id": "stair-bay",
            "name": "Stair Bay",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 12,
              "w": 16,
              "h": 22
            }
          },
          {
            "id": "south-bay",
            "name": "South Bay",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 62,
              "w": 16,
              "h": 22
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                34
              ],
              [
                50,
                42
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                50,
                54
              ],
              [
                50,
                62
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              26,
              48
            ],
            "facing": "W",
            "kind": "door"
          },
          {
            "at": [
              74,
              48
            ],
            "facing": "E",
            "kind": "door"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              16
            ],
            "kind": "stairs-up",
            "label": "to Upper Entrance"
          },
          {
            "at": [
              50,
              78
            ],
            "kind": "stairs-down",
            "label": "to 4th Floor"
          },
          {
            "at": [
              14,
              47
            ],
            "kind": "chest",
            "label": "Western Treasury"
          },
          {
            "at": [
              18,
              50
            ],
            "kind": "loot",
            "label": "Sator carcasses"
          },
          {
            "at": [
              86,
              47
            ],
            "kind": "chest",
            "label": "Eastern Treasury"
          },
          {
            "at": [
              82,
              50
            ],
            "kind": "elite",
            "label": "Sator Praetor"
          },
          {
            "at": [
              50,
              48
            ],
            "kind": "mob",
            "label": "Sator Drones ×3"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N",
            "tone": "north",
            "size": 2.6
          },
          {
            "at": [
              50,
              98
            ],
            "text": "5th Floor (orange)",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "upper-entrance",
        "name": "Upper Entrance",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "cross-hall",
            "name": "Cross Hall",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  36,
                  28
                ],
                [
                  64,
                  28
                ],
                [
                  64,
                  56
                ],
                [
                  78,
                  56
                ],
                [
                  78,
                  72
                ],
                [
                  22,
                  72
                ],
                [
                  22,
                  56
                ],
                [
                  36,
                  56
                ]
              ]
            }
          },
          {
            "id": "north-arm",
            "name": "North Arm",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 4,
              "w": 16,
              "h": 24
            }
          },
          {
            "id": "west-arm",
            "name": "West Arm",
            "shape": {
              "kind": "rect",
              "x": 6,
              "y": 58,
              "w": 16,
              "h": 12
            }
          },
          {
            "id": "east-arm",
            "name": "East Arm",
            "shape": {
              "kind": "rect",
              "x": 78,
              "y": 58,
              "w": 16,
              "h": 12
            }
          },
          {
            "id": "south-bay",
            "name": "South Bay",
            "shape": {
              "kind": "rect",
              "x": 42,
              "y": 72,
              "w": 16,
              "h": 18
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                28
              ],
              [
                50,
                4
              ]
            ],
            "width": 3
          }
        ],
        "doors": [
          {
            "at": [
              50,
              4
            ],
            "facing": "N",
            "kind": "gate",
            "label": "Eldersator chamber"
          }
        ],
        "markers": [
          {
            "at": [
              50,
              8
            ],
            "kind": "entrance",
            "label": "ENTER · Eldersator"
          },
          {
            "at": [
              50,
              42
            ],
            "kind": "mob",
            "label": "Sator Warriors ×3"
          },
          {
            "at": [
              50,
              64
            ],
            "kind": "elite",
            "label": "Sator Praetor"
          },
          {
            "at": [
              14,
              64
            ],
            "kind": "loot",
            "label": "Sator carcass"
          },
          {
            "at": [
              86,
              64
            ],
            "kind": "loot",
            "label": "Sator carcass"
          },
          {
            "at": [
              50,
              84
            ],
            "kind": "stairs-down",
            "label": "to 5th Floor"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              99
            ],
            "text": "S · stairs down",
            "tone": "muted",
            "size": 2.4
          },
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N · ELDERSATOR",
            "tone": "title",
            "size": 2.4
          }
        ]
      },
      {
        "id": "sixth",
        "name": "6th Floor",
        "orientation": "north-up",
        "metresPerUnit": 2,
        "rooms": [
          {
            "id": "elder-alcove",
            "name": "Elder Alcove",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  8
                ],
                [
                  66,
                  8
                ],
                [
                  72,
                  24
                ],
                [
                  58,
                  38
                ],
                [
                  42,
                  38
                ],
                [
                  28,
                  24
                ]
              ]
            },
            "tone": "boss"
          },
          {
            "id": "south-hall",
            "name": "South Hall",
            "shape": {
              "kind": "rect",
              "x": 36,
              "y": 44,
              "w": 28,
              "h": 22
            }
          },
          {
            "id": "chasm",
            "name": "The Chasm (to Vessel)",
            "shape": {
              "kind": "rect",
              "x": 68,
              "y": 70,
              "w": 24,
              "h": 22
            },
            "tone": "hazard"
          },
          {
            "id": "stair-bay",
            "name": "Stair Bay",
            "shape": {
              "kind": "rect",
              "x": 8,
              "y": 70,
              "w": 24,
              "h": 22
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                50,
                38
              ],
              [
                50,
                44
              ]
            ],
            "width": 3
          },
          {
            "points": [
              [
                36,
                60
              ],
              [
                32,
                70
              ]
            ],
            "width": 2.5
          },
          {
            "points": [
              [
                64,
                60
              ],
              [
                68,
                70
              ]
            ],
            "width": 2.5
          }
        ],
        "doors": [],
        "markers": [
          {
            "at": [
              50,
              22
            ],
            "kind": "boss",
            "label": "Elder Sator (rare BOSS)",
            "notes": "Elder Sator is a rare spawn — clear surrounding rooms first, watch for the chasm jump."
          },
          {
            "at": [
              50,
              56
            ],
            "kind": "mob",
            "label": "Sator Warriors ×3"
          },
          {
            "at": [
              80,
              82
            ],
            "kind": "portal",
            "label": "Chasm jump → Vessel",
            "notes": "One-way drop into the Vessel chamber across the chasm. Bring rope or accept the fall."
          },
          {
            "at": [
              20,
              82
            ],
            "kind": "stairs-down",
            "label": "to Upper Entrance"
          },
          {
            "at": [
              42,
              50
            ],
            "kind": "loot",
            "label": "Sator carcass"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              2
            ],
            "text": "▲ N · Elder Sator",
            "tone": "title",
            "size": 2.4
          },
          {
            "at": [
              50,
              98
            ],
            "text": "6th Floor (purple)",
            "tone": "muted",
            "size": 2.2
          }
        ]
      },
      {
        "id": "vessel",
        "name": "Vessel Chamber",
        "orientation": "north-up",
        "metresPerUnit": 2.5,
        "rooms": [
          {
            "id": "ring-outer",
            "name": "Outer Ring",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  14,
                  18
                ],
                [
                  86,
                  18
                ],
                [
                  92,
                  40
                ],
                [
                  86,
                  68
                ],
                [
                  68,
                  86
                ],
                [
                  32,
                  86
                ],
                [
                  14,
                  68
                ],
                [
                  8,
                  40
                ]
              ]
            }
          },
          {
            "id": "ring-middle",
            "name": "Middle Ring",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  24,
                  30
                ],
                [
                  76,
                  30
                ],
                [
                  82,
                  46
                ],
                [
                  76,
                  68
                ],
                [
                  64,
                  80
                ],
                [
                  36,
                  80
                ],
                [
                  24,
                  68
                ],
                [
                  18,
                  46
                ]
              ]
            },
            "tone": "hazard"
          },
          {
            "id": "ring-inner",
            "name": "Pit Lip",
            "shape": {
              "kind": "poly",
              "points": [
                [
                  34,
                  42
                ],
                [
                  66,
                  42
                ],
                [
                  70,
                  54
                ],
                [
                  60,
                  68
                ],
                [
                  40,
                  68
                ],
                [
                  30,
                  54
                ]
              ]
            },
            "tone": "boss"
          },
          {
            "id": "landing",
            "name": "Chasm Landing",
            "shape": {
              "kind": "rect",
              "x": 76,
              "y": 6,
              "w": 16,
              "h": 12
            }
          }
        ],
        "corridors": [
          {
            "points": [
              [
                84,
                18
              ],
              [
                84,
                30
              ]
            ],
            "width": 3
          }
        ],
        "doors": [],
        "markers": [
          {
            "at": [
              84,
              12
            ],
            "kind": "entrance",
            "label": "Chasm landing (from 6th)"
          },
          {
            "at": [
              50,
              55
            ],
            "kind": "boss",
            "label": "Sator Queen (BOSS)"
          },
          {
            "at": [
              40,
              36
            ],
            "kind": "mob",
            "label": "Vessel Husk"
          },
          {
            "at": [
              60,
              36
            ],
            "kind": "mob",
            "label": "Vessel Husk"
          },
          {
            "at": [
              30,
              62
            ],
            "kind": "mob",
            "label": "Sator Warriors ×2"
          },
          {
            "at": [
              70,
              62
            ],
            "kind": "mob",
            "label": "Sator Warriors ×2"
          },
          {
            "at": [
              22,
              24
            ],
            "kind": "loot",
            "label": "Royal Brood"
          },
          {
            "at": [
              78,
              80
            ],
            "kind": "chest",
            "label": "Vessel Hoard"
          }
        ],
        "labels": [
          {
            "at": [
              50,
              4
            ],
            "text": "▲ N · Vessel",
            "tone": "title",
            "size": 2.6
          },
          {
            "at": [
              50,
              98
            ],
            "text": "Pit at the heart",
            "tone": "hazard",
            "size": 2.2
          }
        ]
      }
    ],
    "sources": [
      "https://www.mortalonlinemap.info/268/sator-dungeon/dungeon",
      "https://mortalonline2.com/forums/threads/sator-dungeon-psa.6216/",
      "https://www.youtube.com/watch?v=muMxlJmyZwk (Vessel + Sator Elder)"
    ]
  },
  {
    "id": "beth-jedda-ratzar-hatcher-tunnels",
    "name": "Beth Jedda Ratzar Hatcher Tunnels",
    "region": "Sarducaa · Beth Jedda outskirts",
    "difficulty": "Unrated",
    "groupSize": "Route reference",
    "level": "Unrated",
    "summary": "A source-faithful route schematic of the Ratzar Hatcher tunnel systems near Beth Jedda. Natural passages, forks, chambers, hazards, and the marked tunnel endpoints retain their positions from the recorded run.",
    "mobs": ["Ratzar Hatchers"],
    "drops": [],
    "verified": false,
    "caveats": [
      "The drawing contains multiple disconnected tunnel sections shown together for route reference.",
      "North is indicated on the source schematic; distances are not to scale."
    ],
    "levels": [{
      "id": "route-schematic",
      "name": "Tunnel Route Schematic",
      "orientation": "north-up",
      "planImage": "/assets/dungeons/beth-jedda-ratzar-hatcher-tunnels.png?v=5",
      "rooms": [], "corridors": [], "doors": [], "markers": [], "labels": []
    }],
    "sources": ["Mortal Nexus player-recorded cartography"]
  },
  {
    "id": "bone-pit",
    "name": "Bone Pit",
    "region": "Sarducaa · north of Ashir",
    "difficulty": "Unrated",
    "groupSize": "Route reference",
    "level": "Unrated",
    "summary": "A complete Bone Pit route schematic assembled from the connected halls and chambers in the recorded map. Colored marks, room shapes, stairs, exits, and dead ends retain their source positions.",
    "mobs": [],
    "drops": [],
    "verified": false,
    "caveats": [
      "Separate wings are presented together as one route overview.",
      "The schematic is north-up and is not drawn to scale."
    ],
    "levels": [{
      "id": "route-schematic",
      "name": "Route Schematic",
      "orientation": "north-up",
      "planImage": "/assets/dungeons/bone-pit.png?v=5",
      "rooms": [], "corridors": [], "doors": [], "markers": [], "labels": []
    }],
    "sources": ["Mortal Nexus player-recorded cartography"]
  },
  {
    "id": "tuz-salt-mine",
    "name": "Tuz Salt Mine",
    "region": "Sarducaa · Tuz",
    "difficulty": "Unrated",
    "groupSize": "Route reference",
    "level": "Unrated",
    "summary": "A source-faithful overview of the Tuz Salt Mine, including its built chambers, connecting passages, cave section, forks, exits, and recorded points of interest.",
    "mobs": [],
    "drops": ["Salt mine resources"],
    "verified": false,
    "caveats": [
      "Disconnected sections are arranged together exactly as recorded in the source overview.",
      "The schematic is north-up and is not drawn to scale."
    ],
    "levels": [{
      "id": "route-schematic",
      "name": "Mine Route Schematic",
      "orientation": "north-up",
      "planImage": "/assets/dungeons/tuz-salt-mine.png?v=5",
      "rooms": [], "corridors": [], "doors": [], "markers": [], "labels": []
    }],
    "sources": ["Mortal Nexus player-recorded cartography"]
  },
  {
    "id": "yel-keskar-hideout",
    "name": "Yel Keskar Hideout",
    "region": "Sarducaa · Yel Keskar territory",
    "difficulty": "Unrated",
    "groupSize": "Route reference",
    "level": "Unrated",
    "summary": "A full route schematic of the Yel Keskar Hideout. The long north-south complex, western wing, eastern approach, branching rooms, alternate entrances, and colored route notes follow the recorded map.",
    "mobs": [],
    "drops": [],
    "verified": false,
    "caveats": [
      "The source records more than one entrance and approach route.",
      "The schematic is north-up and is not drawn to scale."
    ],
    "levels": [{
      "id": "route-schematic",
      "name": "Hideout Route Schematic",
      "orientation": "north-up",
      "planImage": "/assets/dungeons/yel-keskar-hideout.png?v=5",
      "rooms": [], "corridors": [], "doors": [], "markers": [], "labels": []
    }],
    "sources": ["Mortal Nexus player-recorded cartography"]
  },
  {
    "id": "halls-of-kepher",
    "name": "Halls of Kepher",
    "region": "Sarducaa · southwest of Beth Jedda",
    "difficulty": "Unrated",
    "groupSize": "Route reference",
    "level": "Unrated",
    "summary": "A source-faithful Halls of Kepher route map showing the main chamber network, outer approaches, narrow connectors, branching rooms, and the isolated marked chamber.",
    "mobs": [],
    "drops": [],
    "verified": false,
    "caveats": [
      "Detached sections and approach corridors are shown in their recorded orientation.",
      "The schematic is north-up and is not drawn to scale."
    ],
    "levels": [{
      "id": "route-schematic",
      "name": "Hall Route Schematic",
      "orientation": "north-up",
      "planImage": "/assets/dungeons/halls-of-kepher.png?v=5",
      "rooms": [], "corridors": [], "doors": [], "markers": [], "labels": []
    }],
    "sources": ["Mortal Nexus player-recorded cartography"]
  }
];

const satorDungeon = DUNGEONS.find((dungeon) => dungeon.id === "sator-dungeon");
if (satorDungeon) {
  const planImages = {
    "bottom": "/assets/dungeons/sator-bottom-floor.png?v=4",
    "second": "/assets/dungeons/sator-second-floor.png?v=4",
    "lower-entrance": "/assets/dungeons/sator-lower-entrance.png?v=4",
    "fourth": "/assets/dungeons/sator-fourth-floor.png?v=4",
    "fifth": "/assets/dungeons/sator-fifth-floor.png?v=4",
    "upper-entrance": "/assets/dungeons/sator-upper-entrance.png?v=4",
    "sixth": "/assets/dungeons/sator-sixth-floor.png?v=4",
    "vessel": "/assets/dungeons/sator-vessel-floors.png?v=4"
  };
  for (const floor of satorDungeon.levels) {
    floor.planImage = planImages[floor.id];
    floor.metresPerUnit = null;
  }
  Object.assign(satorDungeon, {
    summary: "An eight-layer Sator Dungeon atlas reconstructed directly from the recorded color-coded floor map. Each tab isolates one route layer so crossings, stairs, the central pit, both entrances, the Elder Sator approach, and the Vessel section remain readable.",
    mobs: ["Sator", "Elder Sator", "The Vessel"],
    drops: [],
    caveats: [
      "Floor names and colors follow the player-recorded source legend.",
      "Use the floor tabs to separate overlapping routes around the central pit.",
      "The schematics preserve route topology but are not drawn to scale."
    ],
    sources: ["Mortal Nexus player-recorded cartography"]
  });
}

const satorIndex = DUNGEONS.findIndex((dungeon) => dungeon.id === "sator-dungeon");
if (satorIndex >= 0) DUNGEONS.splice(satorIndex, 1);
