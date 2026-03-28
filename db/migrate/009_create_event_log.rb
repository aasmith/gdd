Sequel.migration do
  change do
    create_table(:event_log) do
      primary_key :id
      Integer :planting_id
      Integer :sheet_id
      String :action, null: false
      String :details, text: true
      DateTime :created_at, null: false
    end
  end
end
