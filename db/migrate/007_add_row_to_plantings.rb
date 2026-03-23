Sequel.migration do
  change do
    add_column :plantings, :row, Integer
  end
end
