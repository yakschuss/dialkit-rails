# frozen_string_literal: true

require "dial_kit/attribute_builder"

module DialKit
  module ViewHelpers
    def dial_kit(*args)
      return "".html_safe unless DialKit.enabled?

      name, config = extract_dial_kit_arguments(args)
      AttributeBuilder.new(name: name, config: config).build
    end

    private

    def extract_dial_kit_arguments(args)
      if args.first.is_a?(String)
        [args[0], args[1] || {}]
      else
        [nil, args[0] || {}]
      end
    end
  end
end
