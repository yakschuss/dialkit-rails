# frozen_string_literal: true

require "rails/engine"
require "dial_kit/middleware"
require "dial_kit/view_helpers"

module DialKit
  class Engine < ::Rails::Engine
    initializer "dial_kit.assets" do |app|
      app.middleware.use ::Rack::Static,
        urls: ["/dial_kit"],
        root: DialKit::Engine.root.join("app/assets").to_s
    end

    initializer "dial_kit.middleware" do |app|
      app.middleware.use DialKit::Middleware
    end

    initializer "dial_kit.view_helpers" do
      ActiveSupport.on_load(:action_view) do
        include DialKit::ViewHelpers
      end

      if defined?(ActionView::Base) && !ActionView::Base.include?(DialKit::ViewHelpers)
        ActionView::Base.include(DialKit::ViewHelpers)
      end
    end
  end
end
