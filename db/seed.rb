def seed(db)
  # GDD Methods
  warm_id = db[:gdd_methods].insert(name: "Warm", base_f: 50.0, cap_f: 86.0)
  hardy_id = db[:gdd_methods].insert(name: "Hardy", base_f: 40.0, cap_f: 86.0)

  # Crops
  [
    { name: "Tomato",  variety: "Early Girl",    gdd: 1400, gdd_method_id: warm_id },
    { name: "Pepper",  variety: "Jalapeño",      gdd: 1600, gdd_method_id: warm_id },
    { name: "Bean",    variety: "Blue Lake Bush", gdd: 1200, gdd_method_id: warm_id },
    { name: "Squash",  variety: "Zucchini",      gdd: 1400, gdd_method_id: warm_id },
    { name: "Pea",     variety: "Sugar Snap",    gdd: 1000, gdd_method_id: hardy_id },
    { name: "Lettuce", variety: "Buttercrunch",  gdd: 700,  gdd_method_id: hardy_id },
    { name: "Spinach", variety: "Bloomsdale",    gdd: 600,  gdd_method_id: hardy_id },
    { name: "Kale",    variety: "Lacinato",      gdd: 750,  gdd_method_id: hardy_id },
  ].each { |c| db[:crops].insert(c) }

  # Settings (single row)
  db[:settings].insert(season_start: "03-01", season_end: "11-01")
end
