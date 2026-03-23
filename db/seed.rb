def seed(db)
  # GDD Methods — per-crop base/cap from OSU Extension EM 9305 where available,
  # otherwise from extension literature with default 86°F cap.

  # OSU-researched methods (specific cap from their studies)
  tomato_id    = db[:gdd_methods].insert(name: "Tomato (45/92)",        base_f: 45.0, cap_f: 92.0)
  pepper_id    = db[:gdd_methods].insert(name: "Sweet Pepper (52/100)", base_f: 52.0, cap_f: 100.0)
  cucumber_id  = db[:gdd_methods].insert(name: "Cucumber (50/90)",      base_f: 50.0, cap_f: 90.0)
  bean_id      = db[:gdd_methods].insert(name: "Snap Bean (40/90)",     base_f: 40.0, cap_f: 90.0)
  corn_id      = db[:gdd_methods].insert(name: "Sweet Corn (44/86)",    base_f: 44.0, cap_f: 86.0)
  brassica_id  = db[:gdd_methods].insert(name: "Brassica (32/70)",     base_f: 32.0, cap_f: 70.0)

  # Extension base temps (cap defaulted to 86°F)
  hardy_id     = db[:gdd_methods].insert(name: "Hardy (40/86)",         base_f: 40.0, cap_f: 86.0)
  carrot_id    = db[:gdd_methods].insert(name: "Carrot (38/86)",        base_f: 38.0, cap_f: 86.0)
  onion_id     = db[:gdd_methods].insert(name: "Onion (35/86)",         base_f: 35.0, cap_f: 86.0)
  strawberry_id = db[:gdd_methods].insert(name: "Strawberry (39/86)",   base_f: 39.0, cap_f: 86.0)
  squash_id    = db[:gdd_methods].insert(name: "Squash (45/86)",        base_f: 45.0, cap_f: 86.0)
  melon_id     = db[:gdd_methods].insert(name: "Melon (50/86)",         base_f: 50.0, cap_f: 86.0)
  watermelon_id = db[:gdd_methods].insert(name: "Watermelon (55/86)",   base_f: 55.0, cap_f: 86.0)
  eggplant_id  = db[:gdd_methods].insert(name: "Eggplant (60/86)",     base_f: 60.0, cap_f: 86.0)
  okra_id      = db[:gdd_methods].insert(name: "Okra (60/86)",          base_f: 60.0, cap_f: 86.0)
  sweet_potato_id = db[:gdd_methods].insert(name: "Sweet Potato (60/86)", base_f: 60.0, cap_f: 86.0)
  asparagus_id = db[:gdd_methods].insert(name: "Asparagus (40/86)",     base_f: 40.0, cap_f: 86.0)

  # Crops — GDD values from OSU Extension EM 9305 where noted.
  # Crops marked (est.) have estimated GDD — replace with observed data.
  [
    # === OSU-researched crops ===

    # Tomatoes (transplanted, base 45/92)
    { name: "Tomato",    variety: "New Girl",       gdd: 1844, gdd_method_id: tomato_id },
    { name: "Tomato",    variety: "Big Beef",       gdd: 1970, gdd_method_id: tomato_id },
    { name: "Tomato",    variety: "Indigo Rose",    gdd: 2010, gdd_method_id: tomato_id },
    { name: "Tomato",    variety: "Monica",         gdd: 1976, gdd_method_id: tomato_id },

    # Sweet Peppers (transplanted, base 52/100)
    { name: "Pepper",    variety: "King Arthur",        gdd: 1321, gdd_method_id: pepper_id },
    { name: "Pepper",    variety: "Bell King",          gdd: 1447, gdd_method_id: pepper_id },
    { name: "Pepper",    variety: "Gatherer's Gold",    gdd: 1212, gdd_method_id: pepper_id },
    { name: "Pepper",    variety: "Stocky Red Roaster", gdd: 1211, gdd_method_id: pepper_id },

    # Cucumbers (base 50/90)
    { name: "Cucumber",  variety: "Marketmore 76 (transplant)", gdd: 805,  gdd_method_id: cucumber_id },
    { name: "Cucumber",  variety: "Marketmore 76 (seed)",       gdd: 1211, gdd_method_id: cucumber_id },
    { name: "Cucumber",  variety: "Cobra (seed)",               gdd: 964,  gdd_method_id: cucumber_id },
    { name: "Cucumber",  variety: "Dasher II (seed)",           gdd: 1060, gdd_method_id: cucumber_id },

    # Snap Beans (direct-seeded, base 40/90)
    { name: "Bean",      variety: "Provider",       gdd: 1681, gdd_method_id: bean_id },
    { name: "Bean",      variety: "Sahara",         gdd: 1805, gdd_method_id: bean_id },

    # Sweet Corn (direct-seeded, base 44/86)
    { name: "Corn",      variety: "Jubilee",        gdd: 1539, gdd_method_id: corn_id },
    { name: "Corn",      variety: "Luscious",       gdd: 1854, gdd_method_id: corn_id },

    # Brassicas (transplanted, base 32/70)
    { name: "Broccoli",  variety: "Green Magic",    gdd: 2103, gdd_method_id: brassica_id },
    { name: "Broccoli",  variety: "Arcadia",        gdd: 2281, gdd_method_id: brassica_id },
    { name: "Broccoli",  variety: "Imperial",       gdd: 2383, gdd_method_id: brassica_id },

    # === Extension base temps, estimated GDD ===

    # Hardy greens (base 40/86)
    { name: "Pea",       variety: "Sugar Snap",     gdd: 1000, gdd_method_id: hardy_id },
    { name: "Lettuce",   variety: "Buttercrunch",   gdd: 700,  gdd_method_id: hardy_id },
    { name: "Spinach",   variety: "Bloomsdale",     gdd: 600,  gdd_method_id: hardy_id },
    { name: "Kale",      variety: "Lacinato",       gdd: 750,  gdd_method_id: hardy_id },
    { name: "Collards",  variety: "(est.)",         gdd: 900,  gdd_method_id: hardy_id },
    { name: "Beet",      variety: "(est.)",         gdd: 1000, gdd_method_id: hardy_id },
    { name: "Potato",    variety: "(est.)",         gdd: 1400, gdd_method_id: hardy_id },

    # Carrots (base 38/86)
    { name: "Carrot",    variety: "Nantes (est.)",  gdd: 1200, gdd_method_id: carrot_id },

    # Onion (base 35/86)
    { name: "Onion",     variety: "(est.)",         gdd: 1800, gdd_method_id: onion_id },

    # Asparagus (base 40/86)
    { name: "Asparagus", variety: "(est.)",         gdd: 500,  gdd_method_id: asparagus_id },

    # Strawberry (base 39/86)
    { name: "Strawberry", variety: "(est.)",        gdd: 1400, gdd_method_id: strawberry_id },

    # Squash (base 45/86)
    { name: "Squash",    variety: "Zucchini (est.)", gdd: 1200, gdd_method_id: squash_id },

    # Melon / Cantaloupe (base 50/86)
    { name: "Cantaloupe", variety: "(est.)",        gdd: 1800, gdd_method_id: melon_id },

    # Watermelon (base 55/86)
    { name: "Watermelon", variety: "(est.)",        gdd: 2200, gdd_method_id: watermelon_id },

    # Eggplant (base 60/86)
    { name: "Eggplant",  variety: "(est.)",         gdd: 1400, gdd_method_id: eggplant_id },

    # Okra (base 60/86)
    { name: "Okra",      variety: "Clemson (est.)", gdd: 1100, gdd_method_id: okra_id },

    # Sweet Potato (base 60/86)
    { name: "Sweet Potato", variety: "(est.)",      gdd: 2200, gdd_method_id: sweet_potato_id },
  ].each { |c| db[:crops].insert(c) }

  # Settings (single row)
  db[:settings].insert(season_start: "03-01", season_end: "11-01", week_line_day: 6)
end
