# frozen_string_literal: true

module DialKit
  class Configuration
    attr_accessor :enabled, :keyboard_shortcut, :position, :z_index

    def initialize
      @enabled = true
      @keyboard_shortcut = "ctrl+shift+d"
      @position = "middle-right"
      @z_index = 99999
    end
  end
end
