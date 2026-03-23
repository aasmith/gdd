module Routes
  module Plantings
    def self.registered(app)
      app.get "/api/plantings" do
        rows = DB[:plantings]
          .left_join(:crops, id: :crop_id)
          .left_join(:gdd_methods, id: Sequel[:crops][:gdd_method_id])
          .select(
            Sequel[:plantings][:id],
            Sequel[:plantings][:crop_id],
            Sequel[:plantings][:plant_date],
            Sequel[:plantings][:seeding_date],
            Sequel[:plantings][:emergence_date],
            Sequel[:plantings][:first_harvest],
            Sequel[:plantings][:removal_date],
            Sequel[:plantings][:notes],
            Sequel[:plantings][:row],
            Sequel[:crops][:name].as(:crop_name),
            Sequel[:crops][:variety],
            Sequel[:crops][:gdd].as(:gdd_required),
            Sequel[:crops][:gdd_method_id],
            Sequel[:gdd_methods][:name].as(:gdd_method_name),
            Sequel[:gdd_methods][:base_f],
            Sequel[:gdd_methods][:cap_f]
          ).all
        json rows
      end

      app.post "/api/plantings" do
        data = JSON.parse(request.body.read)
        id = DB[:plantings].insert(
          crop_id: data["crop_id"],
          plant_date: data["plant_date"],
          seeding_date: data["seeding_date"],
          emergence_date: data["emergence_date"],
          first_harvest: data["first_harvest"],
          removal_date: data["removal_date"],
          notes: data["notes"],
          row: data["row"]
        )
        json DB[:plantings][id: id]
      end

      app.put "/api/plantings/:id" do
        data = JSON.parse(request.body.read)
        updates = {}
        %w[crop_id plant_date seeding_date emergence_date first_harvest removal_date notes row].each do |f|
          updates[f.to_sym] = data[f] if data.key?(f)
        end
        DB[:plantings].where(id: params[:id]).update(updates)
        json DB[:plantings][id: params[:id].to_i]
      end

      app.delete "/api/plantings/:id" do
        DB[:plantings].where(id: params[:id]).delete
        json({ deleted: true })
      end
    end
  end
end
