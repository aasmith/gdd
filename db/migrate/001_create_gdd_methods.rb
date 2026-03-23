Sequel.migration do
  change do
    create_table(:gdd_methods) do
      primary_key :id
      String :name, null: false, unique: true
      Float :base_f, null: false
      Float :cap_f, null: false
    end
  end
end
