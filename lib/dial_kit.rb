# frozen_string_literal: true

require "dial_kit/version"
require "dial_kit/configuration"

module DialKit
  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration)
    end

    def enabled?
      return false unless defined?(Rails)

      configuration.enabled && (Rails.env.development? || Rails.env.test?)
    end

    def reset!
      @configuration = Configuration.new
    end
  end
end

require "dial_kit/engine" if defined?(Rails::Engine)
