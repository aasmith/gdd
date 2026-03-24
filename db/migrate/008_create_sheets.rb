Sequel.migration do
  change do
    create_table(:sheets) do
      primary_key :id
      String :name, null: false
      Integer :year, null: false
    end

    add_column :plantings, :sheet_id, Integer
  end
end
