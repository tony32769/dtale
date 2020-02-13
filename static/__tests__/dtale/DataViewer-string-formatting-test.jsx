import { mount } from "enzyme";
import React from "react";
import { ModalFooter } from "react-modal-bootstrap";
import { Provider } from "react-redux";
import MultiGrid from "react-virtualized/dist/commonjs/MultiGrid";

import mockPopsicle from "../MockPopsicle";
import { clickColMenuButton } from "../iframe/iframe-utils";
import * as t from "../jest-assertions";
import reduxUtils from "../redux-test-utils";
import { buildInnerHTML, withGlobalJquery } from "../test-utils";

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");

describe("DataViewer tests", () => {
  const { open } = window;

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 500,
    });
    delete window.open;
    window.open = jest.fn();

    const mockBuildLibs = withGlobalJquery(() =>
      mockPopsicle.mock(url => {
        const { urlFetcher } = require("../redux-test-utils").default;
        return urlFetcher(url);
      })
    );

    const mockChartUtils = withGlobalJquery(() => (ctx, cfg) => {
      const chartCfg = {
        ctx,
        cfg,
        data: cfg.data,
        destroyed: false,
      };
      chartCfg.destroy = function destroy() {
        chartCfg.destroyed = true;
      };
      return chartCfg;
    });

    jest.mock("popsicle", () => mockBuildLibs);
    jest.mock("chart.js", () => mockChartUtils);
    jest.mock("chartjs-plugin-zoom", () => ({}));
    jest.mock("chartjs-chart-box-and-violin-plot/build/Chart.BoxPlot.js", () => ({}));
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    window.open = open;
  });

  test("DataViewer: string formatting", done => {
    const { DataViewer } = require("../../dtale/DataViewer");
    const Formatting = require("../../popups/formats/Formatting").default;
    const StringFormatting = require("../../popups/formats/StringFormatting").default;

    const store = reduxUtils.createDtaleStore();
    buildInnerHTML({ settings: "" }, store);
    const result = mount(
      <Provider store={store}>
        <DataViewer />
      </Provider>,
      {
        attachTo: document.getElementById("content"),
      }
    );

    setTimeout(() => {
      result.update();
      // select column
      result
        .find(".main-grid div.headerCell div")
        .at(2)
        .simulate("click");
      result.update();
      clickColMenuButton(result, "Formats");
      result.update();
      t.equal(result.find(StringFormatting).length, 1, "should open string formatting");

      const input = result
        .find(StringFormatting)
        .find("div.form-group")
        .at(0)
        .find("input");

      input.simulate("change", { target: { value: "2" } });
      t.equal(
        result
          .find(StringFormatting)
          .find("div.row")
          .last()
          .text(),
        "Raw:I am a long piece of text, please truncate me.Truncated:...",
        "should truncate text"
      );

      result
        .find(Formatting)
        .find(ModalFooter)
        .first()
        .find("button")
        .first()
        .simulate("click");
      setTimeout(() => {
        result.update();
        const grid = result
          .find(MultiGrid)
          .first()
          .instance();
        t.equal(grid.props.data["0"].col3.view, "...", "should update grid formatting");
        done();
      }, 400);
    }, 400);
  });
});
