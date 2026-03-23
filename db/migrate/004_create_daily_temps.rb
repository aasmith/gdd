Sequel.migration do
  change do
    create_table(:daily_temps) do
      Date :date, primary_key: true
      Float :temp_min, null: false
      Float :temp_max, null: false
    end
  end
end
