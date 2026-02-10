# frozen_string_literal: true

require_relative "lib/dial_kit/version"

Gem::Specification.new do |spec|
  spec.name = "dialkit-rails"
  spec.version = DialKit::VERSION
  spec.authors = ["jschuss"]
  spec.email = ["dialkit@example.com"]

  spec.summary = "Live CSS tuning panel for Rails development"
  spec.description = "A development-only floating panel with sliders, toggles, and controls " \
                     "that update CSS custom properties in real-time. Zero config, zero JS build changes. " \
                     "Inspired by Josh Puckett's DialKit for React."
  spec.homepage = "https://github.com/jschuss/dialkit-rails"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage

  spec.files = Dir[
    "lib/**/*",
    "app/**/*",
    "config/**/*",
    "MIT-LICENSE",
    "Rakefile",
  ]
  spec.require_paths = ["lib"]

  spec.add_dependency "rails", ">= 7.0"
end
