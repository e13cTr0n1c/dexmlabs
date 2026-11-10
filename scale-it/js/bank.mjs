// Scale It puzzle bank. Every figure was read from the source URL stored with it.
// Launch day is 1 October 2026 in the UK. Day 0 is that date. There are 48 days, then the set stops.
export const LAUNCH = '2026-10-01';
export const HUMAN_M = 1.75;
export const ITEMS = {
  "spitfire": {
    "id": "spitfire",
    "name": "Spitfire Mk Vb",
    "art": "spitfire",
    "body": "length",
    "metrics": {
      "length": {
        "value": 9.119,
        "unit": "m",
        "published": "29 ft 11 in",
        "source": "https://en.wikipedia.org/wiki/Supermarine_Spitfire"
      },
      "span": {
        "value": 11.227,
        "unit": "m",
        "published": "36 ft 10 in",
        "source": "https://en.wikipedia.org/wiki/Supermarine_Spitfire"
      },
      "mass": {
        "value": 3039.069,
        "unit": "kg",
        "published": "6,700 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Supermarine_Spitfire"
      },
      "speed": {
        "value": 595.457,
        "unit": "km/h",
        "published": "370 mph maximum",
        "source": "https://en.wikipedia.org/wiki/Supermarine_Spitfire"
      }
    }
  },
  "cessna": {
    "id": "cessna",
    "name": "Cessna 172R",
    "art": "cessna",
    "body": "length",
    "metrics": {
      "length": {
        "value": 8.28,
        "unit": "m",
        "published": "27 ft 2 in",
        "source": "https://en.wikipedia.org/wiki/Cessna_172"
      },
      "span": {
        "value": 10.998,
        "unit": "m",
        "published": "36 ft 1 in",
        "source": "https://en.wikipedia.org/wiki/Cessna_172"
      },
      "mass": {
        "value": 1111.301,
        "unit": "kg",
        "published": "2,450 lb gross",
        "source": "https://en.wikipedia.org/wiki/Cessna_172"
      },
      "speed": {
        "value": 225.944,
        "unit": "km/h",
        "published": "122 kn cruise",
        "source": "https://en.wikipedia.org/wiki/Cessna_172"
      },
      "range": {
        "value": 1288.992,
        "unit": "km",
        "published": "696 nmi",
        "source": "https://en.wikipedia.org/wiki/Cessna_172"
      }
    }
  },
  "cherokee": {
    "id": "cherokee",
    "name": "Cherokee 140",
    "art": "cherokee",
    "body": "length",
    "metrics": {
      "length": {
        "value": 7.102,
        "unit": "m",
        "published": "23 ft 3.6 in",
        "source": "https://en.wikipedia.org/wiki/Piper_PA-28_Cherokee"
      },
      "span": {
        "value": 9.144,
        "unit": "m",
        "published": "30 ft",
        "source": "https://en.wikipedia.org/wiki/Piper_PA-28_Cherokee"
      },
      "mass": {
        "value": 975.224,
        "unit": "kg",
        "published": "2,150 lb",
        "source": "https://en.wikipedia.org/wiki/Piper_PA-28_Cherokee"
      }
    }
  },
  "wright": {
    "id": "wright",
    "name": "Wright Flyer",
    "art": "wright",
    "body": "length",
    "metrics": {
      "length": {
        "value": 6.43,
        "unit": "m",
        "published": "6.43 m",
        "source": "https://en.wikipedia.org/wiki/Wright_Flyer"
      },
      "span": {
        "value": 12.29,
        "unit": "m",
        "published": "12.29 m",
        "source": "https://en.wikipedia.org/wiki/Wright_Flyer"
      },
      "speed": {
        "value": 48,
        "unit": "km/h",
        "published": "48 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Wright_Flyer"
      },
      "mass": {
        "value": 338,
        "unit": "kg",
        "published": "338 kg maximum",
        "source": "https://en.wikipedia.org/wiki/Wright_Flyer"
      }
    }
  },
  "hurricane": {
    "id": "hurricane",
    "name": "Hurricane Mk IIC",
    "art": "hurricane",
    "body": "length",
    "metrics": {
      "length": {
        "value": 9.754,
        "unit": "m",
        "published": "32 ft",
        "source": "https://en.wikipedia.org/wiki/Hawker_Hurricane"
      },
      "span": {
        "value": 12.192,
        "unit": "m",
        "published": "40 ft",
        "source": "https://en.wikipedia.org/wiki/Hawker_Hurricane"
      },
      "mass": {
        "value": 3950.79,
        "unit": "kg",
        "published": "8,710 lb maximum",
        "source": "https://en.wikipedia.org/wiki/Hawker_Hurricane"
      },
      "speed": {
        "value": 547.177,
        "unit": "km/h",
        "published": "340 mph maximum",
        "source": "https://en.wikipedia.org/wiki/Hawker_Hurricane"
      }
    }
  },
  "p51": {
    "id": "p51",
    "name": "P-51D Mustang",
    "art": "mustang",
    "body": "length",
    "metrics": {
      "length": {
        "value": 9.83,
        "unit": "m",
        "published": "32 ft 3 in",
        "source": "https://en.wikipedia.org/wiki/North_American_P-51_Mustang"
      },
      "span": {
        "value": 11.278,
        "unit": "m",
        "published": "37 ft",
        "source": "https://en.wikipedia.org/wiki/North_American_P-51_Mustang"
      },
      "speed": {
        "value": 709.316,
        "unit": "km/h",
        "published": "383 kn maximum",
        "source": "https://en.wikipedia.org/wiki/North_American_P-51_Mustang"
      }
    }
  },
  "bf109": {
    "id": "bf109",
    "name": "Bf 109G-6",
    "art": "bf109",
    "body": "length",
    "metrics": {
      "length": {
        "value": 8.95,
        "unit": "m",
        "published": "8.95 m",
        "source": "https://en.wikipedia.org/wiki/Messerschmitt_Bf_109"
      },
      "span": {
        "value": 9.925,
        "unit": "m",
        "published": "9.925 m",
        "source": "https://en.wikipedia.org/wiki/Messerschmitt_Bf_109"
      }
    }
  },
  "zero": {
    "id": "zero",
    "name": "A6M2 Zero",
    "art": "zero",
    "body": "length",
    "metrics": {
      "length": {
        "value": 9.06,
        "unit": "m",
        "published": "9.06 m",
        "source": "https://en.wikipedia.org/wiki/Mitsubishi_A6M_Zero"
      },
      "span": {
        "value": 12,
        "unit": "m",
        "published": "12 m",
        "source": "https://en.wikipedia.org/wiki/Mitsubishi_A6M_Zero"
      },
      "speed": {
        "value": 533,
        "unit": "km/h",
        "published": "533 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Mitsubishi_A6M_Zero"
      }
    }
  },
  "lancaster": {
    "id": "lancaster",
    "name": "Lancaster I",
    "art": "lancaster",
    "body": "length",
    "metrics": {
      "length": {
        "value": 21.133,
        "unit": "m",
        "published": "69 ft 4 in",
        "source": "https://en.wikipedia.org/wiki/Avro_Lancaster"
      },
      "span": {
        "value": 31.09,
        "unit": "m",
        "published": "102 ft",
        "source": "https://en.wikipedia.org/wiki/Avro_Lancaster"
      }
    }
  },
  "halifax": {
    "id": "halifax",
    "name": "Halifax Mk III",
    "art": "halifax",
    "body": "length",
    "metrics": {
      "length": {
        "value": 21.641,
        "unit": "m",
        "published": "71 ft",
        "source": "https://en.wikipedia.org/wiki/Handley_Page_Halifax"
      },
      "span": {
        "value": 31.699,
        "unit": "m",
        "published": "104 ft",
        "source": "https://en.wikipedia.org/wiki/Handley_Page_Halifax"
      }
    }
  },
  "b17": {
    "id": "b17",
    "name": "B-17G",
    "art": "b17",
    "body": "length",
    "metrics": {
      "length": {
        "value": 22.66,
        "unit": "m",
        "published": "22.66 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_B-17_Flying_Fortress"
      },
      "span": {
        "value": 31.62,
        "unit": "m",
        "published": "31.62 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_B-17_Flying_Fortress"
      }
    }
  },
  "mosquito": {
    "id": "mosquito",
    "name": "Mosquito B Mk XVI",
    "art": "mosquito",
    "body": "length",
    "metrics": {
      "length": {
        "value": 13.564,
        "unit": "m",
        "published": "44 ft 6 in",
        "source": "https://en.wikipedia.org/wiki/de_Havilland_Mosquito"
      },
      "span": {
        "value": 16.51,
        "unit": "m",
        "published": "54 ft 2 in",
        "source": "https://en.wikipedia.org/wiki/de_Havilland_Mosquito"
      },
      "speed": {
        "value": 667.878,
        "unit": "km/h",
        "published": "415 mph maximum",
        "source": "https://en.wikipedia.org/wiki/de_Havilland_Mosquito"
      }
    }
  },
  "meteor": {
    "id": "meteor",
    "name": "Meteor F.8",
    "art": "meteor",
    "body": "length",
    "metrics": {
      "length": {
        "value": 13.589,
        "unit": "m",
        "published": "44 ft 7 in",
        "source": "https://en.wikipedia.org/wiki/Gloster_Meteor"
      },
      "span": {
        "value": 11.328,
        "unit": "m",
        "published": "37 ft 2 in",
        "source": "https://en.wikipedia.org/wiki/Gloster_Meteor"
      },
      "speed": {
        "value": 965.606,
        "unit": "km/h",
        "published": "600 mph maximum",
        "source": "https://en.wikipedia.org/wiki/Gloster_Meteor"
      }
    }
  },
  "vulcan": {
    "id": "vulcan",
    "name": "Vulcan B.1",
    "art": "vulcan",
    "body": "length",
    "metrics": {
      "length": {
        "value": 29.591,
        "unit": "m",
        "published": "97 ft 1 in",
        "source": "https://en.wikipedia.org/wiki/Avro_Vulcan"
      },
      "span": {
        "value": 30.302,
        "unit": "m",
        "published": "99 ft 5 in",
        "source": "https://en.wikipedia.org/wiki/Avro_Vulcan"
      }
    }
  },
  "b52": {
    "id": "b52",
    "name": "B-52H",
    "art": "b52",
    "body": "length",
    "metrics": {
      "length": {
        "value": 48.5,
        "unit": "m",
        "published": "48.5 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_B-52_Stratofortress"
      },
      "span": {
        "value": 56.4,
        "unit": "m",
        "published": "56.4 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_B-52_Stratofortress"
      },
      "mass": {
        "value": 221323,
        "unit": "kg",
        "published": "221,323 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_B-52_Stratofortress"
      }
    }
  },
  "concorde": {
    "id": "concorde",
    "name": "Concorde",
    "art": "concorde",
    "body": "length",
    "metrics": {
      "length": {
        "value": 61.66,
        "unit": "m",
        "published": "61.66 m",
        "source": "https://en.wikipedia.org/wiki/Concorde",
        "alt": {
          "value": 62.19,
          "unit": "m",
          "published": "62.19 m total length",
          "source": "https://corporate.airfrance.com/en/news/concorde-lands-new-york"
        }
      },
      "span": {
        "value": 25.6,
        "unit": "m",
        "published": "25.6 m",
        "source": "https://en.wikipedia.org/wiki/Concorde"
      },
      "speed": {
        "value": 2179,
        "unit": "km/h",
        "published": "2,179 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Concorde"
      },
      "range": {
        "value": 7222.8,
        "unit": "km",
        "published": "7,222.8 km",
        "source": "https://en.wikipedia.org/wiki/Concorde"
      },
      "mass": {
        "value": 185070,
        "unit": "kg",
        "published": "185,070 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Concorde"
      }
    }
  },
  "tu144": {
    "id": "tu144",
    "name": "Tu-144D",
    "art": "tu144",
    "body": "length",
    "metrics": {
      "length": {
        "value": 65.7,
        "unit": "m",
        "published": "65.7 m",
        "source": "https://en.wikipedia.org/wiki/Tupolev_Tu-144"
      },
      "span": {
        "value": 28.8,
        "unit": "m",
        "published": "28.8 m",
        "source": "https://en.wikipedia.org/wiki/Tupolev_Tu-144"
      },
      "speed": {
        "value": 2500,
        "unit": "km/h",
        "published": "2,500 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Tupolev_Tu-144"
      },
      "range": {
        "value": 6500,
        "unit": "km",
        "published": "6,500 km",
        "source": "https://en.wikipedia.org/wiki/Tupolev_Tu-144"
      }
    }
  },
  "b737": {
    "id": "b737",
    "name": "737-800",
    "art": "liner",
    "body": "length",
    "metrics": {
      "length": {
        "value": 39.47,
        "unit": "m",
        "published": "39.47 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_737_Next_Generation"
      },
      "span": {
        "value": 35.79,
        "unit": "m",
        "published": "35.79 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_737_Next_Generation"
      },
      "mass": {
        "value": 79016,
        "unit": "kg",
        "published": "79,016 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_737_Next_Generation"
      },
      "range": {
        "value": 5420.804,
        "unit": "km",
        "published": "2,927 nmi",
        "source": "https://en.wikipedia.org/wiki/Boeing_737_Next_Generation"
      },
      "speed": {
        "value": 837.104,
        "unit": "km/h",
        "published": "452 kn cruise",
        "source": "https://en.wikipedia.org/wiki/Boeing_737_Next_Generation"
      }
    }
  },
  "b747": {
    "id": "b747",
    "name": "747-400",
    "art": "jumbo",
    "body": "length",
    "metrics": {
      "length": {
        "value": 70.66,
        "unit": "m",
        "published": "70.66 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-400"
      },
      "span": {
        "value": 64.44,
        "unit": "m",
        "published": "64.44 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-400"
      },
      "mass": {
        "value": 396890,
        "unit": "kg",
        "published": "396,890 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-400"
      },
      "range": {
        "value": 13490,
        "unit": "km",
        "published": "13,490 km",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-400"
      }
    }
  },
  "b7478": {
    "id": "b7478",
    "name": "747-8",
    "art": "jumbo8",
    "body": "length",
    "metrics": {
      "length": {
        "value": 76.251,
        "unit": "m",
        "published": "250 ft 2 in",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-8"
      },
      "span": {
        "value": 68.402,
        "unit": "m",
        "published": "224 ft 5 in",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-8"
      },
      "mass": {
        "value": 447695.669,
        "unit": "kg",
        "published": "987,000 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-8"
      },
      "range": {
        "value": 14310,
        "unit": "km",
        "published": "14,310 km",
        "source": "https://en.wikipedia.org/wiki/Boeing_747-8"
      }
    }
  },
  "a380": {
    "id": "a380",
    "name": "A380",
    "art": "a380",
    "body": "length",
    "metrics": {
      "length": {
        "value": 72.72,
        "unit": "m",
        "published": "72.72 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A380"
      },
      "span": {
        "value": 79.75,
        "unit": "m",
        "published": "79.75 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A380"
      },
      "height": {
        "value": 24.09,
        "unit": "m",
        "published": "24.09 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A380"
      },
      "mass": {
        "value": 575000,
        "unit": "kg",
        "published": "575 t maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Airbus_A380"
      },
      "range": {
        "value": 14800,
        "unit": "km",
        "published": "14,800 km",
        "source": "https://en.wikipedia.org/wiki/Airbus_A380"
      }
    }
  },
  "b777": {
    "id": "b777",
    "name": "777-300ER",
    "art": "triple",
    "body": "length",
    "metrics": {
      "length": {
        "value": 73.86,
        "unit": "m",
        "published": "73.86 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_777"
      },
      "span": {
        "value": 64.8,
        "unit": "m",
        "published": "64.8 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_777"
      },
      "mass": {
        "value": 351535,
        "unit": "kg",
        "published": "351,535 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_777"
      },
      "range": {
        "value": 14685,
        "unit": "km",
        "published": "14,685 km",
        "source": "https://en.wikipedia.org/wiki/Boeing_777"
      }
    }
  },
  "b787": {
    "id": "b787",
    "name": "787-9",
    "art": "dream",
    "body": "length",
    "metrics": {
      "length": {
        "value": 62.81,
        "unit": "m",
        "published": "62.81 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_787_Dreamliner"
      },
      "span": {
        "value": 60.12,
        "unit": "m",
        "published": "60.12 m",
        "source": "https://en.wikipedia.org/wiki/Boeing_787_Dreamliner"
      },
      "mass": {
        "value": 259228,
        "unit": "kg",
        "published": "259,228 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_787_Dreamliner"
      },
      "range": {
        "value": 15370,
        "unit": "km",
        "published": "15,370 km",
        "source": "https://en.wikipedia.org/wiki/Boeing_787_Dreamliner"
      }
    }
  },
  "a350": {
    "id": "a350",
    "name": "A350-900",
    "art": "a350",
    "body": "length",
    "metrics": {
      "length": {
        "value": 66.8,
        "unit": "m",
        "published": "66.8 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A350"
      },
      "span": {
        "value": 64.75,
        "unit": "m",
        "published": "64.75 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A350"
      },
      "mass": {
        "value": 283000,
        "unit": "kg",
        "published": "283,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Airbus_A350"
      },
      "range": {
        "value": 15750,
        "unit": "km",
        "published": "15,750 km",
        "source": "https://en.wikipedia.org/wiki/Airbus_A350"
      },
      "speed": {
        "value": 903,
        "unit": "km/h",
        "published": "903 km/h cruise",
        "source": "https://en.wikipedia.org/wiki/Airbus_A350"
      }
    }
  },
  "an225": {
    "id": "an225",
    "name": "An-225",
    "art": "an225",
    "body": "length",
    "metrics": {
      "length": {
        "value": 84,
        "unit": "m",
        "published": "84 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-225_Mriya"
      },
      "span": {
        "value": 88.4,
        "unit": "m",
        "published": "88.4 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-225_Mriya"
      },
      "mass": {
        "value": 640000,
        "unit": "kg",
        "published": "640,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-225_Mriya"
      },
      "speed": {
        "value": 850,
        "unit": "km/h",
        "published": "850 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-225_Mriya"
      },
      "range": {
        "value": 15400,
        "unit": "km",
        "published": "15,400 km with maximum fuel",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-225_Mriya"
      }
    }
  },
  "an124": {
    "id": "an124",
    "name": "An-124-100M",
    "art": "an124",
    "body": "length",
    "metrics": {
      "length": {
        "value": 69.1,
        "unit": "m",
        "published": "69.1 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-124_Ruslan"
      },
      "span": {
        "value": 73.3,
        "unit": "m",
        "published": "73.3 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-124_Ruslan"
      },
      "mass": {
        "value": 402000,
        "unit": "kg",
        "published": "402,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-124_Ruslan"
      }
    }
  },
  "an22": {
    "id": "an22",
    "name": "An-22",
    "art": "an22",
    "body": "length",
    "metrics": {
      "length": {
        "value": 57.92,
        "unit": "m",
        "published": "57.92 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-22"
      },
      "span": {
        "value": 64.4,
        "unit": "m",
        "published": "64.4 m",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-22"
      },
      "mass": {
        "value": 250000,
        "unit": "kg",
        "published": "250,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Antonov_An-22"
      }
    }
  },
  "c5": {
    "id": "c5",
    "name": "C-5M Galaxy",
    "art": "c5",
    "body": "length",
    "metrics": {
      "length": {
        "value": 75.311,
        "unit": "m",
        "published": "247 ft 1 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-5_Galaxy"
      },
      "span": {
        "value": 67.894,
        "unit": "m",
        "published": "222 ft 9 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-5_Galaxy"
      },
      "mass": {
        "value": 381017.591,
        "unit": "kg",
        "published": "840,000 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-5_Galaxy"
      }
    }
  },
  "c17": {
    "id": "c17",
    "name": "C-17A",
    "art": "c17",
    "body": "length",
    "metrics": {
      "length": {
        "value": 53.035,
        "unit": "m",
        "published": "174 ft",
        "source": "https://en.wikipedia.org/wiki/Boeing_C-17_Globemaster_III"
      },
      "span": {
        "value": 51.755,
        "unit": "m",
        "published": "169 ft 9.6 in",
        "source": "https://en.wikipedia.org/wiki/Boeing_C-17_Globemaster_III"
      },
      "mass": {
        "value": 265351.536,
        "unit": "kg",
        "published": "585,000 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Boeing_C-17_Globemaster_III"
      }
    }
  },
  "c130": {
    "id": "c130",
    "name": "C-130H",
    "art": "c130",
    "body": "length",
    "metrics": {
      "length": {
        "value": 29.794,
        "unit": "m",
        "published": "97 ft 9 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-130_Hercules"
      },
      "span": {
        "value": 40.411,
        "unit": "m",
        "published": "132 ft 7 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-130_Hercules"
      },
      "mass": {
        "value": 70306.817,
        "unit": "kg",
        "published": "155,000 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Lockheed_C-130_Hercules"
      }
    }
  },
  "a400": {
    "id": "a400",
    "name": "A400M",
    "art": "a400",
    "body": "length",
    "metrics": {
      "length": {
        "value": 45.1,
        "unit": "m",
        "published": "45.1 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A400M_Atlas"
      },
      "span": {
        "value": 42.4,
        "unit": "m",
        "published": "42.4 m",
        "source": "https://en.wikipedia.org/wiki/Airbus_A400M_Atlas"
      },
      "mass": {
        "value": 141000,
        "unit": "kg",
        "published": "141,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Airbus_A400M_Atlas"
      }
    }
  },
  "h4": {
    "id": "h4",
    "name": "H-4 Hercules",
    "art": "spruce",
    "body": "length",
    "metrics": {
      "length": {
        "value": 66.65,
        "unit": "m",
        "published": "218 ft 8 in",
        "source": "https://en.wikipedia.org/wiki/Hughes_H-4_Hercules"
      },
      "span": {
        "value": 97.511,
        "unit": "m",
        "published": "319 ft 11 in",
        "source": "https://en.wikipedia.org/wiki/Hughes_H-4_Hercules"
      }
    }
  },
  "roc": {
    "id": "roc",
    "name": "Stratolaunch",
    "art": "roc",
    "body": "length",
    "metrics": {
      "length": {
        "value": 72.542,
        "unit": "m",
        "published": "238 ft",
        "source": "https://en.wikipedia.org/wiki/Scaled_Composites_Stratolaunch"
      },
      "span": {
        "value": 117.348,
        "unit": "m",
        "published": "385 ft",
        "source": "https://en.wikipedia.org/wiki/Scaled_Composites_Stratolaunch"
      },
      "mass": {
        "value": 589670.081,
        "unit": "kg",
        "published": "1,300,000 lb maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Scaled_Composites_Stratolaunch"
      }
    }
  },
  "sr71": {
    "id": "sr71",
    "name": "SR-71A",
    "art": "sr71",
    "body": "length",
    "metrics": {
      "length": {
        "value": 32.741,
        "unit": "m",
        "published": "107 ft 5 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_SR-71_Blackbird"
      },
      "span": {
        "value": 16.942,
        "unit": "m",
        "published": "55 ft 7 in",
        "source": "https://en.wikipedia.org/wiki/Lockheed_SR-71_Blackbird"
      },
      "speed": {
        "value": 3537.32,
        "unit": "km/h",
        "published": "1,910 kn maximum",
        "source": "https://en.wikipedia.org/wiki/Lockheed_SR-71_Blackbird"
      }
    }
  },
  "u2": {
    "id": "u2",
    "name": "U-2S",
    "art": "u2",
    "body": "length",
    "metrics": {
      "length": {
        "value": 19.202,
        "unit": "m",
        "published": "63 ft",
        "source": "https://en.wikipedia.org/wiki/Lockheed_U-2"
      },
      "span": {
        "value": 31.394,
        "unit": "m",
        "published": "103 ft",
        "source": "https://en.wikipedia.org/wiki/Lockheed_U-2"
      }
    }
  },
  "voyager": {
    "id": "voyager",
    "name": "Rutan Voyager",
    "art": "voyager",
    "body": "length",
    "metrics": {
      "length": {
        "value": 8.839,
        "unit": "m",
        "published": "29 ft",
        "source": "https://en.wikipedia.org/wiki/Rutan_Voyager"
      },
      "span": {
        "value": 33.528,
        "unit": "m",
        "published": "110 ft",
        "source": "https://en.wikipedia.org/wiki/Rutan_Voyager"
      },
      "range": {
        "value": 40212,
        "unit": "km",
        "published": "40,212 km",
        "source": "https://en.wikipedia.org/wiki/Rutan_Voyager"
      }
    }
  },
  "f16": {
    "id": "f16",
    "name": "F-16C",
    "art": "f16",
    "body": "length",
    "metrics": {
      "length": {
        "value": 15.062,
        "unit": "m",
        "published": "49 ft 5 in",
        "source": "https://en.wikipedia.org/wiki/General_Dynamics_F-16_Fighting_Falcon"
      },
      "span": {
        "value": 9.957,
        "unit": "m",
        "published": "32 ft 8 in",
        "source": "https://en.wikipedia.org/wiki/General_Dynamics_F-16_Fighting_Falcon"
      }
    }
  },
  "f15": {
    "id": "f15",
    "name": "F-15C",
    "art": "f15",
    "body": "length",
    "metrics": {
      "length": {
        "value": 19.431,
        "unit": "m",
        "published": "63 ft 9 in",
        "source": "https://en.wikipedia.org/wiki/McDonnell_Douglas_F-15_Eagle"
      },
      "span": {
        "value": 13.056,
        "unit": "m",
        "published": "42 ft 10 in",
        "source": "https://en.wikipedia.org/wiki/McDonnell_Douglas_F-15_Eagle"
      }
    }
  },
  "f35": {
    "id": "f35",
    "name": "F-35A",
    "art": "f35",
    "body": "length",
    "metrics": {
      "length": {
        "value": 15.667,
        "unit": "m",
        "published": "51.4 ft",
        "source": "https://en.wikipedia.org/wiki/Lockheed_Martin_F-35_Lightning_II"
      },
      "span": {
        "value": 10.668,
        "unit": "m",
        "published": "35 ft",
        "source": "https://en.wikipedia.org/wiki/Lockheed_Martin_F-35_Lightning_II"
      },
      "speed": {
        "value": 1976,
        "unit": "km/h",
        "published": "1,976 km/h at high altitude",
        "source": "https://en.wikipedia.org/wiki/Lockheed_Martin_F-35_Lightning_II"
      }
    }
  },
  "typhoon": {
    "id": "typhoon",
    "name": "Typhoon",
    "art": "typhoon",
    "body": "length",
    "metrics": {
      "length": {
        "value": 15.96,
        "unit": "m",
        "published": "15.96 m",
        "source": "https://en.wikipedia.org/wiki/Eurofighter_Typhoon"
      },
      "span": {
        "value": 10.95,
        "unit": "m",
        "published": "10.95 m",
        "source": "https://en.wikipedia.org/wiki/Eurofighter_Typhoon"
      },
      "speed": {
        "value": 2495,
        "unit": "km/h",
        "published": "2,495 km/h at 11 km altitude",
        "source": "https://en.wikipedia.org/wiki/Eurofighter_Typhoon"
      },
      "mass": {
        "value": 23500,
        "unit": "kg",
        "published": "23,500 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Eurofighter_Typhoon"
      }
    }
  },
  "tornado": {
    "id": "tornado",
    "name": "Tornado GR4",
    "art": "tornado",
    "body": "length",
    "metrics": {
      "length": {
        "value": 16.72,
        "unit": "m",
        "published": "16.72 m",
        "source": "https://en.wikipedia.org/wiki/Panavia_Tornado"
      },
      "span": {
        "value": 13.91,
        "unit": "m",
        "published": "13.91 m wings spread",
        "source": "https://en.wikipedia.org/wiki/Panavia_Tornado"
      }
    }
  },
  "lightning": {
    "id": "lightning",
    "name": "Lightning F.6",
    "art": "lightning",
    "body": "length",
    "metrics": {
      "length": {
        "value": 16.764,
        "unit": "m",
        "published": "55 ft",
        "source": "https://en.wikipedia.org/wiki/English_Electric_Lightning"
      },
      "span": {
        "value": 10.363,
        "unit": "m",
        "published": "34 ft",
        "source": "https://en.wikipedia.org/wiki/English_Electric_Lightning"
      }
    }
  },
  "a10": {
    "id": "a10",
    "name": "A-10C",
    "art": "a10",
    "body": "length",
    "metrics": {
      "length": {
        "value": 16.26,
        "unit": "m",
        "published": "16.26 m",
        "source": "https://en.wikipedia.org/wiki/Fairchild_Republic_A-10_Thunderbolt_II"
      },
      "span": {
        "value": 17.53,
        "unit": "m",
        "published": "17.53 m",
        "source": "https://en.wikipedia.org/wiki/Fairchild_Republic_A-10_Thunderbolt_II"
      },
      "speed": {
        "value": 706,
        "unit": "km/h",
        "published": "706 km/h at sea level",
        "source": "https://en.wikipedia.org/wiki/Fairchild_Republic_A-10_Thunderbolt_II"
      }
    }
  },
  "chinook": {
    "id": "chinook",
    "name": "CH-47F Chinook",
    "art": "chinook",
    "body": "length",
    "metrics": {
      "length": {
        "value": 30.142,
        "unit": "m",
        "published": "98 ft 10.7 in overall",
        "source": "https://en.wikipedia.org/wiki/Boeing_CH-47_Chinook"
      }
    }
  },
  "mi26": {
    "id": "mi26",
    "name": "Mi-26",
    "art": "mi26",
    "body": "length",
    "metrics": {
      "length": {
        "value": 40.025,
        "unit": "m",
        "published": "40.025 m",
        "source": "https://en.wikipedia.org/wiki/Mil_Mi-26"
      },
      "mass": {
        "value": 56000,
        "unit": "kg",
        "published": "56,000 kg maximum takeoff",
        "source": "https://en.wikipedia.org/wiki/Mil_Mi-26"
      }
    }
  },
  "hindenburg": {
    "id": "hindenburg",
    "name": "Hindenburg",
    "art": "airship",
    "body": "length",
    "metrics": {
      "length": {
        "value": 245,
        "unit": "m",
        "published": "245 m",
        "source": "https://en.wikipedia.org/wiki/LZ_129_Hindenburg"
      },
      "speed": {
        "value": 135,
        "unit": "km/h",
        "published": "135 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/LZ_129_Hindenburg"
      }
    }
  },
  "orbiter": {
    "id": "orbiter",
    "name": "Shuttle orbiter",
    "art": "orbiter",
    "body": "length",
    "metrics": {
      "length": {
        "value": 37.237,
        "unit": "m",
        "published": "37.237 m",
        "source": "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter"
      },
      "span": {
        "value": 23.79,
        "unit": "m",
        "published": "23.79 m",
        "source": "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter"
      },
      "speed": {
        "value": 27870,
        "unit": "km/h",
        "published": "27,870 km/h maximum",
        "source": "https://en.wikipedia.org/wiki/Space_Shuttle_orbiter"
      }
    }
  },
  "stack": {
    "id": "stack",
    "name": "Shuttle stack",
    "art": "stack",
    "body": "height",
    "metrics": {
      "height": {
        "value": 56,
        "unit": "m",
        "published": "56 m stacked",
        "source": "https://en.wikipedia.org/wiki/Space_Shuttle"
      },
      "mass": {
        "value": 2030000,
        "unit": "kg",
        "published": "2,030,000 kg",
        "source": "https://en.wikipedia.org/wiki/Space_Shuttle"
      }
    }
  },
  "saturn": {
    "id": "saturn",
    "name": "Saturn V",
    "art": "saturn",
    "body": "height",
    "metrics": {
      "height": {
        "value": 111,
        "unit": "m",
        "published": "111 m (363 ft)",
        "source": "https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v-grades-5-8/"
      },
      "mass": {
        "value": 2800000,
        "unit": "kg",
        "published": "2.8 million kg fuelled",
        "source": "https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v-grades-5-8/"
      }
    }
  },
  "sls": {
    "id": "sls",
    "name": "SLS",
    "art": "sls",
    "body": "height",
    "metrics": {
      "height": {
        "value": 98.146,
        "unit": "m",
        "published": "322 ft",
        "source": "https://en.wikipedia.org/wiki/Space_Launch_System"
      }
    }
  },
  "heavy": {
    "id": "heavy",
    "name": "Falcon Heavy",
    "art": "heavy",
    "body": "height",
    "metrics": {
      "height": {
        "value": 69.982,
        "unit": "m",
        "published": "229.6 ft",
        "source": "https://en.wikipedia.org/wiki/Falcon_Heavy"
      },
      "mass": {
        "value": 1420000,
        "unit": "kg",
        "published": "1,420,000 kg",
        "source": "https://en.wikipedia.org/wiki/Falcon_Heavy"
      }
    }
  },
  "v2": {
    "id": "v2",
    "name": "V-2",
    "art": "v2",
    "body": "height",
    "metrics": {
      "height": {
        "value": 14,
        "unit": "m",
        "published": "14 m",
        "source": "https://en.wikipedia.org/wiki/V-2_rocket"
      },
      "mass": {
        "value": 12500,
        "unit": "kg",
        "published": "12,500 kg",
        "source": "https://en.wikipedia.org/wiki/V-2_rocket"
      },
      "span": {
        "value": 3.56,
        "unit": "m",
        "published": "3.56 m fin span",
        "source": "https://en.wikipedia.org/wiki/V-2_rocket"
      }
    }
  },
  "shard": {
    "id": "shard",
    "name": "Shard",
    "art": "shard",
    "body": "height",
    "metrics": {
      "height": {
        "value": 309.6,
        "unit": "m",
        "published": "309.6 m",
        "source": "https://www.the-shard.com/about/"
      }
    }
  },
  "burj": {
    "id": "burj",
    "name": "Burj Khalifa",
    "art": "burj",
    "body": "height",
    "metrics": {
      "height": {
        "value": 828,
        "unit": "m",
        "published": "828 m architectural",
        "source": "https://en.wikipedia.org/wiki/Burj_Khalifa"
      }
    }
  },
  "eiffel": {
    "id": "eiffel",
    "name": "Eiffel Tower",
    "art": "eiffel",
    "body": "height",
    "metrics": {
      "height": {
        "value": 330,
        "unit": "m",
        "published": "330 m to the tip",
        "source": "https://en.wikipedia.org/wiki/Eiffel_Tower"
      }
    }
  },
  "empire": {
    "id": "empire",
    "name": "Empire State Building",
    "art": "empire",
    "body": "height",
    "metrics": {
      "height": {
        "value": 443.179,
        "unit": "m",
        "published": "1,454 ft to the tip",
        "source": "https://en.wikipedia.org/wiki/Empire_State_Building"
      }
    }
  },
  "liberty": {
    "id": "liberty",
    "name": "Statue of Liberty",
    "art": "liberty",
    "body": "height",
    "metrics": {
      "height": {
        "value": 46.05,
        "unit": "m",
        "published": "151 ft 1 in, copper statue to the torch",
        "source": "https://en.wikipedia.org/wiki/Statue_of_Liberty"
      }
    }
  },
  "angel": {
    "id": "angel",
    "name": "Angel of the North",
    "art": "angel",
    "body": "height",
    "metrics": {
      "height": {
        "value": 20,
        "unit": "m",
        "published": "20 m",
        "source": "https://en.wikipedia.org/wiki/Angel_of_the_North"
      },
      "span": {
        "value": 54,
        "unit": "m",
        "published": "54 m wing span",
        "source": "https://en.wikipedia.org/wiki/Angel_of_the_North"
      },
      "mass": {
        "value": 208000,
        "unit": "kg",
        "published": "208 tonnes",
        "source": "https://en.wikipedia.org/wiki/Angel_of_the_North"
      }
    }
  },
  "eye": {
    "id": "eye",
    "name": "London Eye",
    "art": "eye",
    "body": "height",
    "metrics": {
      "height": {
        "value": 135,
        "unit": "m",
        "published": "135 m",
        "source": "https://en.wikipedia.org/wiki/London_Eye"
      },
      "span": {
        "value": 120,
        "unit": "m",
        "published": "120 m wheel diameter",
        "source": "https://en.wikipedia.org/wiki/London_Eye"
      }
    }
  },
  "onewtc": {
    "id": "onewtc",
    "name": "One World Trade Center",
    "art": "onewtc",
    "body": "height",
    "metrics": {
      "height": {
        "value": 541.325,
        "unit": "m",
        "published": "1,776 ft architectural",
        "source": "https://en.wikipedia.org/wiki/One_World_Trade_Center"
      }
    }
  },
  "cntower": {
    "id": "cntower",
    "name": "CN Tower",
    "art": "cntower",
    "body": "height",
    "metrics": {
      "height": {
        "value": 553.3,
        "unit": "m",
        "published": "553.3 m architectural",
        "source": "https://en.wikipedia.org/wiki/CN_Tower"
      }
    }
  },
  "pyramid": {
    "id": "pyramid",
    "name": "Great Pyramid",
    "art": "pyramid",
    "body": "height",
    "metrics": {
      "height": {
        "value": 146.6,
        "unit": "m",
        "published": "146.6 m original",
        "source": "https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza"
      },
      "now": {
        "value": 138.5,
        "unit": "m",
        "published": "138.5 m today",
        "source": "https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza"
      }
    }
  },
  "christ": {
    "id": "christ",
    "name": "Christ the Redeemer",
    "art": "christ",
    "body": "height",
    "metrics": {
      "height": {
        "value": 30,
        "unit": "m",
        "published": "30 m, the statue",
        "source": "https://en.wikipedia.org/wiki/Christ_the_Redeemer_(statue)"
      },
      "pedestal": {
        "value": 38,
        "unit": "m",
        "published": "38 m with its pedestal",
        "source": "https://en.wikipedia.org/wiki/Christ_the_Redeemer_(statue)"
      }
    }
  },
  "blackpool": {
    "id": "blackpool",
    "name": "Blackpool Tower",
    "art": "blackpool",
    "body": "height",
    "metrics": {
      "height": {
        "value": 158.115,
        "unit": "m",
        "published": "518 ft 9 in",
        "source": "https://en.wikipedia.org/wiki/Blackpool_Tower"
      }
    }
  },
  "canary": {
    "id": "canary",
    "name": "One Canada Square",
    "art": "canary",
    "body": "height",
    "metrics": {
      "height": {
        "value": 234.696,
        "unit": "m",
        "published": "770 ft above ground",
        "source": "https://en.wikipedia.org/wiki/One_Canada_Square"
      }
    }
  },
  "bttower": {
    "id": "bttower",
    "name": "BT Tower",
    "art": "bttower",
    "body": "height",
    "metrics": {
      "height": {
        "value": 177,
        "unit": "m",
        "published": "177 m to the roof",
        "source": "https://en.wikipedia.org/wiki/BT_Tower"
      },
      "aerial": {
        "value": 189,
        "unit": "m",
        "published": "189 m with the aerial",
        "source": "https://en.wikipedia.org/wiki/BT_Tower"
      }
    }
  },
  "elizabeth": {
    "id": "elizabeth",
    "name": "Elizabeth Tower",
    "art": "elizabeth",
    "body": "height",
    "metrics": {
      "height": {
        "value": 96.317,
        "unit": "m",
        "published": "316 ft",
        "source": "https://en.wikipedia.org/wiki/Big_Ben"
      }
    }
  },
  "towerbridge": {
    "id": "towerbridge",
    "name": "Tower Bridge",
    "art": "towerbridge",
    "body": "length",
    "metrics": {
      "length": {
        "value": 286.512,
        "unit": "m",
        "published": "940 ft including the abutments",
        "source": "https://en.wikipedia.org/wiki/Tower_Bridge"
      },
      "height": {
        "value": 64.922,
        "unit": "m",
        "published": "213 ft towers",
        "source": "https://en.wikipedia.org/wiki/Tower_Bridge"
      }
    }
  },
  "forth": {
    "id": "forth",
    "name": "Forth Bridge",
    "art": "forth",
    "body": "length",
    "metrics": {
      "length": {
        "value": 2467.051,
        "unit": "m",
        "published": "8,094 ft",
        "source": "https://en.wikipedia.org/wiki/Forth_Bridge"
      },
      "span": {
        "value": 518.16,
        "unit": "m",
        "published": "1,700 ft main spans",
        "source": "https://en.wikipedia.org/wiki/Forth_Bridge"
      },
      "height": {
        "value": 110.033,
        "unit": "m",
        "published": "361 ft above high water",
        "source": "https://en.wikipedia.org/wiki/Forth_Bridge"
      }
    }
  },
  "humber": {
    "id": "humber",
    "name": "Humber Bridge",
    "art": "humber",
    "body": "length",
    "metrics": {
      "length": {
        "value": 2220,
        "unit": "m",
        "published": "2,220 m",
        "source": "https://en.wikipedia.org/wiki/Humber_Bridge"
      },
      "span": {
        "value": 1410,
        "unit": "m",
        "published": "1,410 m main span",
        "source": "https://en.wikipedia.org/wiki/Humber_Bridge"
      },
      "height": {
        "value": 155.5,
        "unit": "m",
        "published": "155.5 m",
        "source": "https://en.wikipedia.org/wiki/Humber_Bridge"
      }
    }
  },
  "gateway": {
    "id": "gateway",
    "name": "Gateway Arch",
    "art": "gateway",
    "body": "height",
    "metrics": {
      "height": {
        "value": 192.024,
        "unit": "m",
        "published": "630 ft",
        "source": "https://en.wikipedia.org/wiki/Gateway_Arch"
      },
      "span": {
        "value": 192.024,
        "unit": "m",
        "published": "630 ft wide",
        "source": "https://en.wikipedia.org/wiki/Gateway_Arch"
      }
    }
  },
  "washington": {
    "id": "washington",
    "name": "Washington Monument",
    "art": "obelisk",
    "body": "height",
    "metrics": {
      "height": {
        "value": 169.164,
        "unit": "m",
        "published": "555 ft",
        "source": "https://en.wikipedia.org/wiki/Washington_Monument"
      }
    }
  }
};
export const DAYS = [
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "cessna",
      "b": "spitfire",
      "prompt": "Which has the longer wingspan, the Cessna 172R or the Spitfire Mk Vb?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "concorde",
      "min": 25.5,
      "max": 117.5,
      "step": 0.5,
      "prompt": "How long is the Concorde? Use the 61.66 m specification, in metres."
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "f16",
        "f35",
        "typhoon"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "cntower",
      "b": "onewtc",
      "prompt": "Which is taller, the CN Tower or the One World Trade Center?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "shard",
      "unit": "saturn",
      "min": 0.5,
      "max": 6.5,
      "step": 0.1,
      "prompt": "How many Saturn V rockets, stood one on top of another, match the height of the Shard?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "forth",
      "b": "saturn",
      "prompt": "Which is taller, the Forth Bridge above high water or the Saturn V?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "wright",
        "cherokee",
        "cessna"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "b747",
      "min": 29.5,
      "max": 134.5,
      "step": 0.5,
      "prompt": "How long is the 747-400, in metres?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b787",
      "b": "concorde",
      "prompt": "Which is longer, the 787-9 or the Concorde?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "a380",
      "min": 33.0,
      "max": 152.0,
      "step": 0.5,
      "prompt": "How wide is the wingspan of the A380, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "length",
      "items": [
        "bf109",
        "zero",
        "spitfire"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "angel",
      "b": "b52",
      "prompt": "Which has the longer wingspan, the Angel of the North or the B-52H?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "an225",
      "min": 35.0,
      "max": 160.0,
      "step": 0.5,
      "prompt": "How long is the An-225, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "burj",
      "unit": "shard",
      "min": 0.5,
      "max": 6.5,
      "step": 0.1,
      "prompt": "How many Shards, stood one on top of another, match the architectural height of the Burj Khalifa?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "cessna",
      "b": "wright",
      "prompt": "Which has the longer wingspan, the Cessna 172R or the Wright Flyer?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "eiffel",
      "b": "shard",
      "prompt": "Which is taller, the Eiffel Tower or the Shard?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "hindenburg",
      "min": 102,
      "max": 466,
      "step": 1,
      "prompt": "How long is the Hindenburg, in metres?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "spitfire",
        "hurricane",
        "p51"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b7478",
      "b": "c5",
      "prompt": "Which is longer, the 747-8 or the C-5M Galaxy?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "empire",
      "unit": "saturn",
      "min": 1.0,
      "max": 9.5,
      "step": 0.1,
      "prompt": "How many Saturn V rockets, stood one on top of another, match the Empire State Building to its tip?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "b17",
      "b": "lancaster",
      "prompt": "Which has the longer wingspan, the B-17G or the Lancaster I?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "concorde",
        "b787",
        "tu144"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "sr71",
      "min": 1480,
      "max": 6730,
      "step": 10,
      "prompt": "How fast is the SR-71A? The published maximum, in kilometres an hour."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "f35",
      "b": "typhoon",
      "prompt": "Which is longer, the F-35A or the Typhoon?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "saturn",
      "min": 46,
      "max": 211,
      "step": 1,
      "prompt": "How tall is the Saturn V? The full rocket, in metres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "length",
      "items": [
        "a350",
        "b747",
        "a380"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "f16",
      "b": "f35",
      "prompt": "Which is longer, the F-16C or the F-35A?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "burj",
      "min": 347,
      "max": 1574,
      "step": 1,
      "prompt": "How tall is the Burj Khalifa? The architectural height, in metres."
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "saturn",
      "unit": "v2",
      "min": 2.5,
      "max": 18.5,
      "step": 0.1,
      "prompt": "How many V-2 rockets, stood one on top of another, match the height of a Saturn V?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "meteor",
      "b": "spitfire",
      "prompt": "Which has the longer wingspan, the Meteor F.8 or the Spitfire Mk Vb?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "zero",
      "b": "hurricane",
      "prompt": "Which has the longer wingspan, the A6M2 Zero or the Hurricane Mk IIC?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "shard",
      "min": 130,
      "max": 589,
      "step": 1,
      "prompt": "How tall is the Shard, in metres?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "c5",
        "b7478",
        "an225"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "a350",
      "b": "tu144",
      "prompt": "Which is longer, the A350-900 or the Tu-144D?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "burj",
      "unit": "eiffel",
      "min": 0.5,
      "max": 6.0,
      "step": 0.1,
      "prompt": "How many Eiffel Towers, measured to the tip and stood one on top of another, match the architectural height of the Burj Khalifa?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "an225",
      "b": "h4",
      "prompt": "Which has the longer wingspan, the An-225 or the H-4 Hercules?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "v2",
        "angel",
        "liberty"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "eiffel",
      "min": 138,
      "max": 627,
      "step": 1,
      "prompt": "How tall is the Eiffel Tower? To the tip, including the antenna, in metres."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "p51",
      "b": "spitfire",
      "prompt": "Which is longer, the P-51D Mustang or the Spitfire Mk Vb?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "cessna",
      "min": 4.6000000000000005,
      "max": 20.900000000000002,
      "step": 0.1,
      "prompt": "How wide is the wingspan of the Cessna 172R, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "height",
      "items": [
        "stack",
        "heavy",
        "sls"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "h4",
      "b": "roc",
      "prompt": "Which has the longer wingspan, the H-4 Hercules or the Stratolaunch?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "spitfire",
      "min": 4.7,
      "max": 21.400000000000002,
      "step": 0.1,
      "prompt": "How wide is the wingspan of the Spitfire Mk Vb, in metres?"
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "hindenburg",
      "unit": "concorde",
      "min": 1.0,
      "max": 9.5,
      "step": 0.1,
      "prompt": "How many Concordes, nose to tail, match the length of the Hindenburg?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "zero",
      "b": "bf109",
      "prompt": "Which is longer, the A6M2 Zero or the Bf 109G-6?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "b747",
      "b": "a380",
      "prompt": "Which is longer, the 747-400 or the A380?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "roc",
      "min": 49,
      "max": 223,
      "step": 1,
      "prompt": "How wide is the wingspan of the Stratolaunch, in metres?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "saturn",
        "blackpool",
        "gateway"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "a400",
      "b": "c17",
      "prompt": "Which is longer, the A400M or the C-17A?"
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "a380",
      "unit": "spitfire",
      "min": 2.0,
      "max": 16.5,
      "step": 0.1,
      "prompt": "How many Spitfire Mk Vb wingspans, laid end to end, match the wingspan of an A380?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "b747",
      "b": "an124",
      "prompt": "Which is longer, the 747-400 or the An-124-100M?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "shard",
        "eiffel",
        "empire"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "h4",
      "min": 40.5,
      "max": 185.5,
      "step": 0.5,
      "prompt": "How wide is the wingspan of the H-4 Hercules, in metres?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b777",
      "b": "a380",
      "prompt": "Which is longer, the 777-300ER or the A380?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "voyager",
      "min": 14000,
      "max": 71800,
      "step": 100,
      "prompt": "What is the published range of the Rutan Voyager, in kilometres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "height",
      "items": [
        "onewtc",
        "cntower",
        "burj"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "lancaster",
      "b": "vulcan",
      "prompt": "Which is longer, the Lancaster I or the Vulcan B.1?"
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "orbiter",
      "min": 6900,
      "max": 40500,
      "step": 100,
      "prompt": "How fast is the Shuttle orbiter? The published maximum, in kilometres an hour."
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "roc",
      "unit": "cessna",
      "min": 3.5,
      "max": 25.0,
      "step": 0.1,
      "prompt": "How many Cessna 172R wingspans, laid end to end, match the wingspan of Stratolaunch?"
    },
    {
      "type": "bigger",
      "metric": "speed",
      "a": "concorde",
      "b": "sr71",
      "prompt": "Which is faster on the published figure, the Concorde or the SR-71A?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "speed",
      "a": "f35",
      "b": "typhoon",
      "prompt": "Which is faster on the published figure, the F-35A or the Typhoon?"
    },
    {
      "type": "slider",
      "metric": "mass",
      "item": "an225",
      "min": 288000,
      "max": 1184000,
      "step": 1000,
      "prompt": "How heavy is the An-225? Maximum takeoff mass, in kilograms."
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "concorde",
        "u2",
        "b52"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "b7478",
      "b": "a380",
      "prompt": "Which has the greater mass, the 747-8 or the A380?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "cntower",
      "unit": "eye",
      "min": 1.0,
      "max": 9.5,
      "step": 0.1,
      "prompt": "How many London Eyes, stood one on top of another, match the architectural height of the CN Tower?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "mass",
      "a": "an225",
      "b": "roc",
      "prompt": "Which has the greater mass, the An-225 or the Stratolaunch?"
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "b787",
        "b747",
        "a380"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "slider",
      "metric": "mass",
      "item": "a380",
      "min": 258000,
      "max": 1064000,
      "step": 1000,
      "prompt": "What is the mass of the A380, in kilograms?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "burj",
      "b": "cntower",
      "prompt": "Which is taller, the Burj Khalifa or the CN Tower?"
    },
    {
      "type": "slider",
      "metric": "mass",
      "item": "saturn",
      "min": 1260000,
      "max": 5180000,
      "step": 10000,
      "prompt": "How heavy is the Saturn V? Fuelled mass, in kilograms."
    }
  ],
  [
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "cessna",
        "spitfire",
        "hurricane"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "eiffel",
      "b": "empire",
      "prompt": "Which is taller, the Eiffel Tower or the Empire State Building?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "b737",
      "min": 16.5,
      "max": 75.0,
      "step": 0.5,
      "prompt": "How long is the 737-800, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "stack",
      "unit": "v2",
      "min": 1.0,
      "max": 9.5,
      "step": 0.1,
      "prompt": "How many V-2 rockets, stood one on top of another, match the height of the shuttle stack?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "blackpool",
      "b": "washington",
      "prompt": "Which is taller, the Blackpool Tower or the Washington Monument?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "gateway",
      "b": "humber",
      "prompt": "Which is taller, the Gateway Arch or the Humber Bridge?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "b787",
      "min": 26.0,
      "max": 119.5,
      "step": 0.5,
      "prompt": "How long is the 787-9, in metres?"
    },
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "a380",
        "roc",
        "an225"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "elizabeth",
      "b": "eye",
      "prompt": "Which is taller, the Elizabeth Tower or the London Eye?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "onewtc",
      "unit": "shard",
      "min": 0.5,
      "max": 4.5,
      "step": 0.1,
      "prompt": "How many Shards, stood one on top of another, match the architectural height of One World Trade Center?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "blackpool",
      "b": "canary",
      "prompt": "Which is taller, the Blackpool Tower or the One Canada Square?"
    },
    {
      "type": "order",
      "metric": "speed",
      "items": [
        "cessna",
        "concorde",
        "sr71"
      ],
      "prompt": "Order these from slowest to fastest."
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "tu144",
      "min": 27.5,
      "max": 125.0,
      "step": 0.5,
      "prompt": "How long is the Tu-144D, in metres?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "bttower",
      "b": "washington",
      "prompt": "Which is taller, the BT Tower or the Washington Monument?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "c5",
      "min": 31.5,
      "max": 143.5,
      "step": 0.5,
      "prompt": "How long is the C-5M Galaxy, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "range",
      "items": [
        "cessna",
        "concorde",
        "a350"
      ],
      "prompt": "Order these from shortest range to longest range."
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "christ",
      "b": "liberty",
      "prompt": "Which is taller, Christ the Redeemer or the Statue of Liberty?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "u2",
      "min": 13.0,
      "max": 60.0,
      "step": 0.5,
      "prompt": "How wide is the wingspan of the U-2S, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "eiffel",
      "unit": "eye",
      "min": 0.5,
      "max": 6.0,
      "step": 0.1,
      "prompt": "How many London Eyes, stood one on top of another, match the Eiffel Tower to its tip?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "pyramid",
      "b": "saturn",
      "prompt": "Which is taller, the Great Pyramid or the Saturn V?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "heavy",
      "b": "stack",
      "prompt": "Which is taller, the Falcon Heavy or the Shuttle stack?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "b52",
      "min": 23.5,
      "max": 107.5,
      "step": 0.5,
      "prompt": "How wide is the wingspan of the B-52H, in metres?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "halifax",
        "b17",
        "lancaster"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b7478",
      "b": "a380",
      "prompt": "Which is longer, the 747-8 or the A380?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "pyramid",
      "unit": "saturn",
      "min": 0.5,
      "max": 3.5,
      "step": 0.1,
      "prompt": "How many Saturn V rockets, stood one on top of another, match the original height of the Great Pyramid?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "heavy",
      "b": "sls",
      "prompt": "Which is taller, the Falcon Heavy or the SLS?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "lightning",
        "tornado",
        "f15"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "pyramid",
      "min": 61,
      "max": 279,
      "step": 1,
      "prompt": "How tall is the Great Pyramid? The original height, in metres."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "concorde",
      "b": "orbiter",
      "prompt": "Which has the longer wingspan, the Concorde or the Shuttle orbiter?"
    },
    {
      "type": "slider",
      "metric": "now",
      "item": "pyramid",
      "min": 58,
      "max": 264,
      "step": 1,
      "prompt": "How tall is the Great Pyramid? The height today, in metres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "length",
      "items": [
        "a10",
        "typhoon",
        "f15"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "a400",
      "b": "c130",
      "prompt": "Which has the longer wingspan, the A400M or the C-130H?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "liberty",
      "min": 19.0,
      "max": 87.5,
      "step": 0.5,
      "prompt": "How tall is the Statue of Liberty? The copper statue to the torch, not the pedestal, in metres."
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "angel",
      "unit": "spitfire",
      "min": 1.5,
      "max": 11.5,
      "step": 0.1,
      "prompt": "How many Spitfire Mk Vb wingspans, laid end to end, match the wing span of the Angel of the North?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "a400",
      "b": "b52",
      "prompt": "Which is longer, the A400M or the B-52H?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "mass",
      "a": "b747",
      "b": "b777",
      "prompt": "Which has the greater mass, the 747-400 or the 777-300ER?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "eye",
      "min": 56,
      "max": 257,
      "step": 1,
      "prompt": "How tall is the London Eye, in metres?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "c130",
        "a400",
        "c17"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "cessna",
      "b": "voyager",
      "prompt": "Which is longer, the Cessna 172R or the Rutan Voyager?"
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "humber",
      "unit": "forth",
      "min": 0.5,
      "max": 6.5,
      "step": 0.1,
      "prompt": "How many Forth Bridge main spans, laid end to end, match the main span of the Humber Bridge?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "mass",
      "a": "b747",
      "b": "c5",
      "prompt": "Which has the greater mass, the 747-400 or the C-5M Galaxy?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "an22",
        "an124",
        "an225"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "cntower",
      "min": 232,
      "max": 1052,
      "step": 1,
      "prompt": "How tall is the CN Tower, in metres?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "bf109",
      "b": "cherokee",
      "prompt": "Which has the longer wingspan, the Bf 109G-6 or the Cherokee 140?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "onewtc",
      "min": 227,
      "max": 1029,
      "step": 1,
      "prompt": "How tall is the One World Trade Center, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "length",
      "items": [
        "b737",
        "orbiter",
        "b52"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "f16",
      "b": "typhoon",
      "prompt": "Which has the longer wingspan, the F-16C or the Typhoon?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "empire",
      "min": 186,
      "max": 843,
      "step": 1,
      "prompt": "How tall is the Empire State Building? To the tip, in metres."
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "an225",
      "unit": "spitfire",
      "min": 3.0,
      "max": 21.5,
      "step": 0.1,
      "prompt": "How many Spitfire Mk Vb fuselages, nose to tail, match the length of the An-225?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "a10",
      "b": "tornado",
      "prompt": "Which is longer, the A-10C or the Tornado GR4?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "f16",
      "b": "lightning",
      "prompt": "Which has the longer wingspan, the F-16C or the Lightning F.6?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "elizabeth",
      "min": 40.0,
      "max": 183.5,
      "step": 0.5,
      "prompt": "How tall is the Elizabeth Tower, in metres?"
    },
    {
      "type": "order",
      "metric": "length",
      "items": [
        "sr71",
        "c130",
        "h4"
      ],
      "prompt": "Order these from shortest to longest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "halifax",
      "b": "lancaster",
      "prompt": "Which has the longer wingspan, the Halifax Mk III or the Lancaster I?"
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "forth",
      "unit": "hindenburg",
      "min": 3.5,
      "max": 23.5,
      "step": 0.1,
      "prompt": "How many Hindenburgs, nose to tail, match the length of the Forth Bridge?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "b17",
      "b": "lancaster",
      "prompt": "Which is longer, the B-17G or the Lancaster I?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "elizabeth",
        "eye",
        "canary"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "blackpool",
      "min": 66,
      "max": 301,
      "step": 1,
      "prompt": "How tall is the Blackpool Tower, in metres?"
    },
    {
      "type": "bigger",
      "metric": "speed",
      "a": "zero",
      "b": "hurricane",
      "prompt": "Which is faster on the published figure, the A6M2 Zero or the Hurricane Mk IIC?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "gateway",
      "min": 80,
      "max": 365,
      "step": 1,
      "prompt": "How tall is the Gateway Arch, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "height",
      "items": [
        "christ",
        "liberty",
        "stack"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "speed",
      "a": "meteor",
      "b": "spitfire",
      "prompt": "Which is faster on the published figure, the Meteor F.8 or the Spitfire Mk Vb?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "washington",
      "min": 71,
      "max": 322,
      "step": 1,
      "prompt": "How tall is the Washington Monument, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "burj",
      "unit": "saturn",
      "min": 2.5,
      "max": 17.5,
      "step": 0.1,
      "prompt": "How many Saturn V rockets, stood one on top of another, match the architectural height of the Burj Khalifa?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "pyramid",
      "b": "eye",
      "prompt": "Which is taller, the Great Pyramid or the London Eye?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "c130",
      "b": "chinook",
      "prompt": "Which is longer, the C-130H or the CH-47F Chinook?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "humber",
      "min": 590,
      "max": 2680,
      "step": 10,
      "prompt": "How wide is the wingspan of the Humber Bridge, in metres?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "washington",
        "bttower",
        "gateway"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "mi26",
      "b": "orbiter",
      "prompt": "Which is longer, the Mi-26 or the Shuttle orbiter?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "cntower",
      "unit": "saturn",
      "min": 1.5,
      "max": 11.5,
      "step": 0.1,
      "prompt": "How many Saturn V rockets, stood one on top of another, match the architectural height of the CN Tower?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "an225",
      "b": "hindenburg",
      "prompt": "Which is longer, the An-225 or the Hindenburg?"
    },
    {
      "type": "order",
      "metric": "height",
      "items": [
        "pyramid",
        "humber",
        "blackpool"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "forth",
      "min": 1030,
      "max": 4690,
      "step": 10,
      "prompt": "How long is the Forth Bridge, in metres?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "voyager",
      "b": "u2",
      "prompt": "Which has the longer wingspan, the Rutan Voyager or the U-2S?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "forth",
      "min": 217,
      "max": 985,
      "step": 1,
      "prompt": "How wide is the Forth Bridge? One main span, in metres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "height",
      "items": [
        "forth",
        "saturn",
        "shard"
      ],
      "prompt": "Order these from shortest to tallest."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "b52",
      "b": "u2",
      "prompt": "Which has the longer wingspan, the B-52H or the U-2S?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "towerbridge",
      "min": 120,
      "max": 545,
      "step": 1,
      "prompt": "How long is the Tower Bridge? Including the abutments, in metres."
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "h4",
      "unit": "b737",
      "min": 0.5,
      "max": 6.5,
      "step": 0.1,
      "prompt": "How many 737-800 wingspans, laid end to end, match the wingspan of the H-4 Hercules?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "concorde",
      "b": "tu144",
      "prompt": "Which is longer, the Concorde or the Tu-144D?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "b737",
      "b": "a400",
      "prompt": "Which is longer, the 737-800 or the A400M?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "christ",
      "min": 12.5,
      "max": 57.0,
      "step": 0.5,
      "prompt": "How tall is Christ the Redeemer? The statue itself, not the pedestal, in metres."
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "bf109",
        "spitfire",
        "zero"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "f15",
      "b": "typhoon",
      "prompt": "Which is longer, the F-15C or the Typhoon?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "gateway",
      "unit": "washington",
      "min": 0.5,
      "max": 3.0,
      "step": 0.1,
      "prompt": "How many Washington Monuments, stood one on top of another, match the height of the Gateway Arch?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "length",
      "a": "b737",
      "b": "c130",
      "prompt": "Which is longer, the 737-800 or the C-130H?"
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "f16",
        "typhoon",
        "tornado"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "slider",
      "metric": "pedestal",
      "item": "christ",
      "min": 15.5,
      "max": 72.5,
      "step": 0.5,
      "prompt": "How tall is Christ the Redeemer? The statue with its pedestal, in metres."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "f16",
      "b": "lightning",
      "prompt": "Which is longer, the F-16C or the Lightning F.6?"
    },
    {
      "type": "slider",
      "metric": "span",
      "item": "angel",
      "min": 22.5,
      "max": 103.0,
      "step": 0.5,
      "prompt": "How wide is the Angel of the North? The wing span, in metres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "span",
      "items": [
        "meteor",
        "p51",
        "zero"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "cessna",
      "b": "cherokee",
      "prompt": "Which is longer, the Cessna 172R or the Cherokee 140?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "angel",
      "min": 8.0,
      "max": 38.0,
      "step": 0.5,
      "prompt": "How tall is the Angel of the North, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "eye",
      "unit": "elizabeth",
      "min": 0.5,
      "max": 3.5,
      "step": 0.1,
      "prompt": "How many Elizabeth Towers, stood one on top of another, match the height of the London Eye?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "bf109",
      "b": "spitfire",
      "prompt": "Which has the longer wingspan, the Bf 109G-6 or the Spitfire Mk Vb?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "an124",
      "b": "c5",
      "prompt": "Which has the longer wingspan, the An-124-100M or the C-5M Galaxy?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "stack",
      "min": 23.5,
      "max": 106.5,
      "step": 0.5,
      "prompt": "How tall is the Shuttle stack? The stacked vehicle, in metres."
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "vulcan",
        "lancaster",
        "u2"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "b787",
      "b": "a350",
      "prompt": "Which has the longer wingspan, the 787-9 or the A350-900?"
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "b52",
      "unit": "spitfire",
      "min": 1.5,
      "max": 12.0,
      "step": 0.1,
      "prompt": "How many Spitfire Mk Vb wingspans, laid end to end, match the wingspan of a B-52H?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "forth",
      "b": "humber",
      "prompt": "Which has the longer wingspan, the Forth Bridge or the Humber Bridge?"
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "an22",
        "b777",
        "an124"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "sls",
      "min": 41.0,
      "max": 186.5,
      "step": 0.5,
      "prompt": "How tall is the SLS, in metres?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "hindenburg",
      "b": "towerbridge",
      "prompt": "Which is longer, the Hindenburg or the Tower Bridge?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "heavy",
      "min": 29.0,
      "max": 133.0,
      "step": 0.5,
      "prompt": "How tall is the Falcon Heavy, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "span",
      "items": [
        "h4",
        "an225",
        "roc"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "forth",
      "b": "humber",
      "prompt": "Which is longer, the Forth Bridge or the Humber Bridge?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "v2",
      "min": 5.800000000000001,
      "max": 26.6,
      "step": 0.1,
      "prompt": "How tall is the V-2, in metres?"
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "an225",
      "unit": "concorde",
      "min": 0.5,
      "max": 3.5,
      "step": 0.1,
      "prompt": "How many Concordes, nose to tail, match the length of the An-225?"
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "gateway",
      "b": "washington",
      "prompt": "Which is taller, the Gateway Arch or the Washington Monument?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "angel",
      "b": "christ",
      "prompt": "Which is taller, the Angel of the North or Christ the Redeemer?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "cessna",
      "min": 540,
      "max": 2450,
      "step": 10,
      "prompt": "How far can the Cessna 172R go? The published range, in kilometres."
    },
    {
      "type": "order",
      "metric": "span",
      "items": [
        "voyager",
        "c130",
        "b52"
      ],
      "prompt": "Order these from shortest wingspan to longest wingspan."
    },
    {
      "type": "bigger",
      "metric": "height",
      "a": "canary",
      "b": "shard",
      "prompt": "Which is taller, the One Canada Square or the Shard?"
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "a380",
      "unit": "b737",
      "min": 0.5,
      "max": 5.5,
      "step": 0.1,
      "prompt": "How many 737-800 wingspans, laid end to end, match the wingspan of an A380?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "height",
      "a": "empire",
      "b": "onewtc",
      "prompt": "Which is taller, the Empire State Building or the One World Trade Center?"
    },
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "wright",
        "spitfire",
        "concorde"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "cessna",
      "min": 94,
      "max": 430,
      "step": 1,
      "prompt": "How fast is the Cessna 172R? Cruise speed, in kilometres an hour."
    },
    {
      "type": "bigger",
      "metric": "speed",
      "a": "a350",
      "b": "an225",
      "prompt": "Which is faster on the published figure, the A350-900 or the An-225?"
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "concorde",
      "min": 910,
      "max": 4150,
      "step": 10,
      "prompt": "How fast is the Concorde? The published maximum, in kilometres an hour."
    }
  ],
  [
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "typhoon",
        "mi26",
        "a400"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "bigger",
      "metric": "speed",
      "a": "cessna",
      "b": "spitfire",
      "prompt": "Which is faster on the published figure, the Cessna 172R or the Spitfire Mk Vb?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "concorde",
      "min": 3030,
      "max": 13730,
      "step": 10,
      "prompt": "What is the published range of the Concorde, in kilometres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "burj",
      "unit": "eye",
      "min": 2.0,
      "max": 14.5,
      "step": 0.1,
      "prompt": "How many London Eyes, stood one on top of another, match the architectural height of the Burj Khalifa?"
    },
    {
      "type": "bigger",
      "metric": "range",
      "a": "a350",
      "b": "voyager",
      "prompt": "Which has the longer published range, the A350-900 or the Rutan Voyager?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "range",
      "a": "concorde",
      "b": "tu144",
      "prompt": "Which has the longer published range, the Concorde or the Tu-144D?"
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "typhoon",
      "min": 1040,
      "max": 4750,
      "step": 10,
      "prompt": "How fast is the Typhoon? At 11 km altitude, in kilometres an hour."
    },
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "c130",
        "a400",
        "an22"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "cessna",
      "b": "wright",
      "prompt": "Which has the greater mass, the Cessna 172R or the Wright Flyer?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "empire",
      "unit": "eiffel",
      "min": 0.5,
      "max": 3.5,
      "step": 0.1,
      "prompt": "How many Eiffel Towers, to the tip and stood one on top of another, match the Empire State Building to its tip?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "range",
      "a": "b737",
      "b": "concorde",
      "prompt": "Which has the longer published range, the 737-800 or the Concorde?"
    },
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "b747",
        "an124",
        "an225"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "slider",
      "metric": "speed",
      "item": "f35",
      "min": 820,
      "max": 3760,
      "step": 10,
      "prompt": "How fast is the F-35A? The published high altitude figure, in kilometres an hour."
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "hurricane",
      "b": "spitfire",
      "prompt": "Which has the greater mass, the Hurricane Mk IIC or the Spitfire Mk Vb?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "b747",
      "min": 5600,
      "max": 25700,
      "step": 100,
      "prompt": "How far can the 747-400 go? The published range of the 747-400, in kilometres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "mass",
      "items": [
        "b737",
        "b787",
        "b777"
      ],
      "prompt": "Order these from lightest to heaviest."
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "a380",
      "b": "b52",
      "prompt": "Which has the greater mass, the A380 or the B-52H?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "a350",
      "min": 6600,
      "max": 30000,
      "step": 100,
      "prompt": "What is the published range of the A350-900, in kilometres?"
    },
    {
      "type": "stack",
      "metric": "span",
      "subject": "an225",
      "unit": "b52",
      "min": 0.5,
      "max": 4.0,
      "step": 0.1,
      "prompt": "How many B-52H wingspans, laid end to end, match the wingspan of the An-225?"
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "an22",
      "b": "c17",
      "prompt": "Which has the greater mass, the An-22 or the C-17A?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "mass",
      "a": "mi26",
      "b": "typhoon",
      "prompt": "Which has the greater mass, the Mi-26 or the Typhoon?"
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "b787",
      "min": 6400,
      "max": 29300,
      "step": 100,
      "prompt": "What is the published range of the 787-9, in kilometres?"
    },
    {
      "type": "order",
      "metric": "speed",
      "items": [
        "zero",
        "spitfire",
        "meteor"
      ],
      "prompt": "Order these from slowest to fastest."
    },
    {
      "type": "bigger",
      "metric": "mass",
      "a": "saturn",
      "b": "stack",
      "prompt": "Which has the greater mass, the Saturn V or the Shuttle stack?"
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "hindenburg",
      "unit": "b747",
      "min": 1.0,
      "max": 8.0,
      "step": 0.1,
      "prompt": "How many 747-400s, nose to tail, match the length of the Hindenburg?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "mass",
      "a": "an225",
      "b": "heavy",
      "prompt": "Which has the greater mass, the An-225 or the Falcon Heavy?"
    },
    {
      "type": "order",
      "metric": "speed",
      "items": [
        "a10",
        "an225",
        "concorde"
      ],
      "prompt": "Order these from slowest to fastest."
    },
    {
      "type": "slider",
      "metric": "range",
      "item": "an225",
      "min": 6400,
      "max": 29300,
      "step": 100,
      "prompt": "How far can the An-225 go? With maximum fuel, in kilometres."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b737",
      "b": "orbiter",
      "prompt": "Which is longer, the 737-800 or the Shuttle orbiter?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "bttower",
      "min": 74,
      "max": 337,
      "step": 1,
      "prompt": "How tall is the BT Tower? To the roof, not the aerial, in metres."
    }
  ],
  [
    {
      "type": "order",
      "metric": "speed",
      "items": [
        "hindenburg",
        "cessna",
        "b737"
      ],
      "prompt": "Order these from slowest to fastest."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "orbiter",
      "b": "sr71",
      "prompt": "Which is longer, the Shuttle orbiter or the SR-71A?"
    },
    {
      "type": "slider",
      "metric": "aerial",
      "item": "bttower",
      "min": 79,
      "max": 360,
      "step": 1,
      "prompt": "How tall is the BT Tower? Including the aerial, in metres."
    },
    {
      "type": "stack",
      "metric": "length",
      "subject": "c5",
      "unit": "spitfire",
      "min": 2.5,
      "max": 19.0,
      "step": 0.1,
      "prompt": "How many Spitfire Mk Vb fuselages, nose to tail, match the length of a C-5M?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b747",
      "b": "h4",
      "prompt": "Which is longer, the 747-400 or the H-4 Hercules?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "concorde",
      "b": "vulcan",
      "prompt": "Which has the longer wingspan, the Concorde or the Vulcan B.1?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "canary",
      "min": 98,
      "max": 446,
      "step": 1,
      "prompt": "How tall is the One Canada Square, in metres?"
    },
    {
      "type": "order",
      "metric": "range",
      "items": [
        "tu144",
        "b747",
        "b787"
      ],
      "prompt": "Order these from shortest range to longest range."
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "a10",
      "b": "f15",
      "prompt": "Which has the longer wingspan, the A-10C or the F-15C?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "shard",
      "unit": "eye",
      "min": 0.5,
      "max": 5.5,
      "step": 0.1,
      "prompt": "How many London Eyes, stood one on top of another, match the height of the Shard?"
    }
  ],
  [
    {
      "type": "bigger",
      "metric": "span",
      "a": "f15",
      "b": "tornado",
      "prompt": "Which has the longer wingspan, the F-15C or the Tornado GR4?"
    },
    {
      "type": "order",
      "metric": "range",
      "items": [
        "concorde",
        "b747",
        "voyager"
      ],
      "prompt": "Order these from shortest range to longest range."
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "humber",
      "min": 930,
      "max": 4220,
      "step": 10,
      "prompt": "How long is the Humber Bridge, in metres?"
    },
    {
      "type": "bigger",
      "metric": "span",
      "a": "zero",
      "b": "wright",
      "prompt": "Which has the longer wingspan, the A6M2 Zero or the Wright Flyer?"
    },
    {
      "type": "slider",
      "metric": "height",
      "item": "humber",
      "min": 65,
      "max": 296,
      "step": 1,
      "prompt": "How tall is the Humber Bridge, in metres?"
    }
  ],
  [
    {
      "type": "order",
      "metric": "range",
      "items": [
        "b737",
        "tu144",
        "a380"
      ],
      "prompt": "Order these from shortest range to longest range."
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "halifax",
      "b": "lancaster",
      "prompt": "Which is longer, the Halifax Mk III or the Lancaster I?"
    },
    {
      "type": "slider",
      "metric": "length",
      "item": "mi26",
      "min": 16.5,
      "max": 76.5,
      "step": 0.5,
      "prompt": "How long is the Mi-26, in metres?"
    },
    {
      "type": "stack",
      "metric": "height",
      "subject": "saturn",
      "unit": "stack",
      "min": 0.5,
      "max": 5.0,
      "step": 0.1,
      "prompt": "How many shuttle stacks, stood one on top of another, match the height of a Saturn V?"
    },
    {
      "type": "bigger",
      "metric": "length",
      "a": "b52",
      "b": "c17",
      "prompt": "Which is longer, the B-52H or the C-17A?"
    }
  ]
];
