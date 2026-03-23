Sequel.migration do
  change do
    create_table(:plantings) do
      primary_key :id
      foreign_key :crop_id, :crops, null: false
      Date :plant_date, null: false
      Date :seeding_date
      Date :emergence_date
      Date :first_harvest
      Date :removal_date
      String :notes, text: true
    end
  end
end
