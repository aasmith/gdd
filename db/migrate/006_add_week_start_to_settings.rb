Sequel.migration do
  change do
    add_column :settings, :week_line_day, Integer, default: 6  # 0=Sun, 6=Sat
  end
end
