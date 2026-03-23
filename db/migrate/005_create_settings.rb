Sequel.migration do
  change do
    create_table(:settings) do
      primary_key :id
      String :season_start, default: "03-01"
      String :season_end, default: "11-01"
    end
  end
end
