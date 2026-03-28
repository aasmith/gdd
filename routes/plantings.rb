module Routes
  module Plantings
    def self.log_event(planting_id, sheet_id, action, details = {})
      DB[:event_log].insert(
        planting_id: planting_id,
        sheet_id: sheet_id,
        action: action,
        details: details.to_json,
        created_at: Time.now
      )
    end

    def self.registered(app)
      app.get "/api/plantings" do
        ds = DB[:plantings]
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
            Sequel[:plantings][:sheet_id],
            Sequel[:crops][:name].as(:crop_name),
            Sequel[:crops][:variety],
            Sequel[:crops][:gdd].as(:gdd_required),
            Sequel[:crops][:gdd_method_id],
            Sequel[:gdd_methods][:name].as(:gdd_method_name),
            Sequel[:gdd_methods][:base_f],
            Sequel[:gdd_methods][:cap_f]
          )
        if params[:sheet_id]
          ds = ds.where(Sequel[:plantings][:sheet_id] => params[:sheet_id].to_i)
        end
        json ds.all
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
          row: data["row"],
          sheet_id: data["sheet_id"]
        )
        planting = DB[:plantings][id: id]
        crop = DB[:crops][id: planting[:crop_id]]
        Plantings.log_event(id, planting[:sheet_id], "created",
          crop: "#{crop[:name]} #{crop[:variety]}",
          plant_date: planting[:plant_date].to_s)
        json planting
      end

      app.put "/api/plantings/:id" do
        data = JSON.parse(request.body.read)
        before = DB[:plantings][id: params[:id].to_i]
        updates = {}
        %w[crop_id plant_date seeding_date emergence_date first_harvest removal_date notes row sheet_id].each do |f|
          updates[f.to_sym] = data[f] if data.key?(f)
        end
        DB[:plantings].where(id: params[:id]).update(updates)
        after = DB[:plantings][id: params[:id].to_i]

        # Log what changed
        changes = {}
        updates.each do |k, v|
          bv = before[k].to_s
          av = after[k].to_s
          changes[k] = { from: bv, to: av } if bv != av
        end
        if changes.any?
          crop = DB[:crops][id: after[:crop_id]]
          Plantings.log_event(after[:id], after[:sheet_id], "updated",
            crop: "#{crop[:name]} #{crop[:variety]}",
            changes: changes)
        end

        json after
      end

      app.delete "/api/plantings/:id" do
        planting = DB[:plantings][id: params[:id].to_i]
        if planting
          crop = DB[:crops][id: planting[:crop_id]]
          Plantings.log_event(planting[:id], planting[:sheet_id], "deleted",
            crop: "#{crop[:name]} #{crop[:variety]}",
            plant_date: planting[:plant_date].to_s)
        end
        DB[:plantings].where(id: params[:id]).delete
        json({ deleted: true })
      end
    end
  end
end
