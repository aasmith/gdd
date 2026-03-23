require "sinatra/base"
require "sinatra/json"
require "sequel"
require "json"

DB = Sequel.connect("sqlite://db/gdd.sqlite3")

require_relative "routes/gdd_methods"
require_relative "routes/crops"
require_relative "routes/plantings"
require_relative "routes/settings"
require_relative "routes/gdd"

class App < Sinatra::Base
  helpers Sinatra::JSON

  set :public_folder, File.join(__dir__, "public")

  before "/api/*" do
    content_type :json
  end

  get "/" do
    send_file File.join(settings.public_folder, "index.html")
  end

  register Routes::GddMethods
  register Routes::Crops
  register Routes::Plantings
  register Routes::Settings
  register Routes::Gdd
end
