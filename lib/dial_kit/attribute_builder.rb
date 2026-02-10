# frozen_string_literal: true

require "json"

module DialKit
  class AttributeBuilder
    SMART_DEFAULTS = {
      "blur" => { step: 1 },
      "opacity" => { step: 0.01 },
      "scale" => { step: 0.1 },
      "rotation" => { step: 1 },
      "rotate" => { step: 1 },
      "border_radius" => { step: 1 },
      "gap" => { step: 1 },
      "padding" => { step: 1 },
      "delay" => { step: 0.1 },
      "duration" => { step: 0.1 },
      "stagger" => { step: 0.01 },
    }.freeze

    attr_reader :name, :config

    def initialize(name:, config:)
      @name = name
      @config = config
    end

    def build
      attrs = %(data-dial-kit="#{escape(config_json)}")
      attrs += %( data-dial-kit-name="#{escape(section_name)}") if name

      if attrs.respond_to?(:html_safe)
        attrs.html_safe
      else
        attrs
      end
    end

    private

    def config_json
      JSON.generate(normalize(config))
    end

    def section_name
      name || "Untitled"
    end

    def escape(str)
      str.gsub("&", "&amp;").gsub('"', "&quot;")
    end

    def normalize(hash)
      hash.to_h do |key, value|
        [key.to_s, normalize_value(key.to_s, value)]
      end
    end

    def normalize_value(key, value)
      case value
      when Array
        normalize_array(key, value)
      when true, false
        { "type" => "toggle", "default" => value }
      when String
        normalize_string(value)
      when Numeric
        normalize_number(key, value)
      when Hash
        normalize_hash(key, value)
      else
        raise ArgumentError, "Unsupported config value for #{key}: #{value.inspect}"
      end
    end

    def normalize_array(key, value)
      step = SMART_DEFAULTS.dig(key, :step) || infer_step(value)

      case value.length
      when 3
        { "type" => "slider", "default" => value[0], "min" => value[1], "max" => value[2], "step" => step }
      when 4
        { "type" => "slider", "default" => value[0], "min" => value[1], "max" => value[2], "step" => value[3] }
      else
        raise ArgumentError, "Array must have 3 or 4 elements: [default, min, max] or [default, min, max, step]"
      end
    end

    def normalize_string(value)
      if value.match?(/\A#([0-9a-fA-F]{3,8})\z/)
        { "type" => "color", "default" => value }
      else
        { "type" => "text", "default" => value }
      end
    end

    def normalize_number(key, value)
      smart = SMART_DEFAULTS[key]
      step = smart&.dig(:step) || infer_step_from_value(value)
      range = infer_range(value)
      { "type" => "slider", "default" => value, "min" => range[0], "max" => range[1], "step" => step }
    end

    def normalize_hash(key, value)
      type = (value[:type] || value["type"])&.to_s

      if type
        value.transform_keys(&:to_s)
      else
        { "type" => "group", "controls" => normalize(value) }
      end
    end

    def infer_step(array)
      default = array[0]
      default.is_a?(Float) ? 0.01 : 1
    end

    def infer_step_from_value(value)
      value.is_a?(Float) ? 0.01 : 1
    end

    def infer_range(value)
      if value == 0
        [-100, 100]
      elsif value > 0
        [0, value * 3]
      else
        [value * 3, 0]
      end
    end
  end
end
