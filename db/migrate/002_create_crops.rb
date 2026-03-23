Sequel.migration do
  change do
    create_table(:crops) do
      primary_key :id
      String :name, null: false
      String :variety
      Integer :gdd, null: false
      foreign_key :gdd_method_id, :gdd_methods, null: false
    end
  end
end
