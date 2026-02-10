# frozen_string_literal: true

require "spec_helper"
require "json"

RSpec.describe DialKit::AttributeBuilder do
  def build(name: nil, config: {})
    described_class.new(name: name, config: config).build
  end

  def parsed_config(html)
    match = html.match(/data-dial-kit="([^"]*)"/)
    raw = match[1].gsub("&quot;", '"').gsub("&amp;", "&")
    JSON.parse(raw)
  end

  describe "#build" do
    it "returns data-dial-kit attribute with normalized config" do
      result = build(config: { blur: [16, 0, 100] })

      expect(result).to include("data-dial-kit=")
      config = parsed_config(result)
      expect(config["blur"]).to eq(
        "type" => "slider", "default" => 16, "min" => 0, "max" => 100, "step" => 1,
      )
    end

    it "includes data-dial-kit-name when name is provided" do
      result = build(name: "Hero Card", config: { opacity: [1, 0, 1] })

      expect(result).to include('data-dial-kit-name="Hero Card"')
    end

    it "omits data-dial-kit-name when name is nil" do
      result = build(config: { opacity: [1, 0, 1] })

      expect(result).not_to include("data-dial-kit-name")
    end
  end

  describe "slider normalization" do
    it "normalizes 3-element array to slider" do
      config = parsed_config(build(config: { blur: [16, 0, 100] }))

      expect(config["blur"]["type"]).to eq("slider")
      expect(config["blur"]["default"]).to eq(16)
      expect(config["blur"]["min"]).to eq(0)
      expect(config["blur"]["max"]).to eq(100)
    end

    it "normalizes 4-element array with explicit step" do
      config = parsed_config(build(config: { font_size: [16, 12, 32, 0.5] }))

      expect(config["font_size"]["step"]).to eq(0.5)
    end

    it "uses smart defaults for known properties" do
      config = parsed_config(build(config: { opacity: [1, 0, 1] }))

      expect(config["opacity"]["step"]).to eq(0.01)
    end

    it "infers step from float default" do
      config = parsed_config(build(config: { custom: [1.5, 0, 3] }))

      expect(config["custom"]["step"]).to eq(0.01)
    end

    it "auto-infers range from bare number" do
      config = parsed_config(build(config: { scale: 1.5 }))

      expect(config["scale"]["type"]).to eq("slider")
      expect(config["scale"]["default"]).to eq(1.5)
    end

    it "rejects arrays with wrong length" do
      expect { build(config: { bad: [1, 2] }) }.to raise_error(ArgumentError, /3 or 4 elements/)
    end
  end

  describe "toggle normalization" do
    it "normalizes true to toggle" do
      config = parsed_config(build(config: { visible: true }))

      expect(config["visible"]).to eq("type" => "toggle", "default" => true)
    end

    it "normalizes false to toggle" do
      config = parsed_config(build(config: { hidden: false }))

      expect(config["hidden"]).to eq("type" => "toggle", "default" => false)
    end
  end

  describe "color normalization" do
    it "normalizes hex string to color" do
      config = parsed_config(build(config: { accent: "#3b82f6" }))

      expect(config["accent"]).to eq("type" => "color", "default" => "#3b82f6")
    end

    it "normalizes short hex to color" do
      config = parsed_config(build(config: { bg: "#fff" }))

      expect(config["bg"]).to eq("type" => "color", "default" => "#fff")
    end
  end

  describe "text normalization" do
    it "normalizes plain string to text" do
      config = parsed_config(build(config: { label: "Click me" }))

      expect(config["label"]).to eq("type" => "text", "default" => "Click me")
    end
  end

  describe "group normalization" do
    it "normalizes nested hash without type to group" do
      config = parsed_config(build(config: { shadow: { y: [8, 0, 24], blur: [16, 0, 48] } }))

      expect(config["shadow"]["type"]).to eq("group")
      expect(config["shadow"]["controls"]["y"]["type"]).to eq("slider")
      expect(config["shadow"]["controls"]["blur"]["type"]).to eq("slider")
    end
  end

  describe "explicit type hash" do
    it "passes through select config" do
      config = parsed_config(build(config: {
        theme: { type: :select, options: %w[light dark], default: "light" },
      }))

      expect(config["theme"]["type"]).to eq("select")
      expect(config["theme"]["options"]).to eq(%w[light dark])
    end

    it "passes through action config" do
      config = parsed_config(build(config: { reset: { type: :action } }))

      expect(config["reset"]["type"]).to eq("action")
    end
  end
end
