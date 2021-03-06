import ttiPolyfill from "tti-polyfill";
import PerformImpl from "./performance-impl";

declare global {
  interface Window {
    chrome: any;
  }
}
declare const PerformanceObserver: any;
declare interface PerformanceObserverEntryList {
  getEntries: any;
  getEntriesByName: any;
  getEntriesByType: any;
}

export default class Performance implements PerformImpl {

  /**
   * True if the browser supports the Navigation Timing API,
   * User Timing API and the PerformanceObserver Interface.
   * In Safari, the User Timing API (performance.mark()) is not available,
   * so the DevTools timeline will not be annotated with marks.
   * Support: developer.mozilla.org/en-US/docs/Web/API/Performance/mark
   * Support: developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver
   *
   * @type {boolean}
   */
  public static supported(): boolean {
    return window.performance
           && !!performance.now
           && !!performance.mark;
  }

  /**
   * For now only Chrome fully support the PerformanceObserver interface
   * and the entryType "paint".
   * Firefox 58: https://bugzilla.mozilla.org/show_bug.cgi?id=1403027
   *
   * @type {boolean}
   */
  public static supportedPerformanceObserver(): boolean {
    return window.chrome;
  }

  /**
   * True if the browser supports the PerformanceLongTaskTiming interface.
   * Support: developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming
   *
   * @type {boolean}
   */
  public static supportedLongTask(): boolean {
    return "PerformanceLongTaskTiming" in window;
  }

  public timeToInteractiveDuration: number = 0;
  public config: any;
  private ttiPolyfill: any;
  private perfObserver: any;

  constructor() {
    this.ttiPolyfill = ttiPolyfill;
  }

  /**
   * When performance API available
   * returns a DOMHighResTimeStamp, measured in milliseconds, accurate to five
   * thousandths of a millisecond (5 microseconds).
   * @type {number}
   */
  public now(): number {
    return window.performance.now();
  }

  /**
   * @param {string} metricName
   * @param {string} type
   */
  public mark(metricName: string, type: string) {
    const mark = `mark_${metricName}_${type}`;
    window.performance.mark(mark);
  }

  /**
   * @param {string} metricName
   * @param {object} metrics
   * @param {string} endMark
   */
  public measure(metricName: string, metrics: object): any {
    const startMark = `mark_${metricName}_start`;
    const endMark = `mark_${metricName}_end`;
    window.performance.measure(metricName, startMark, endMark);
    return this.getDurationByMetric(metricName, metrics);
  }

  /**
   * First Paint is essentially the paint after which
   * the biggest above-the-fold layout change has happened.
   * PerformanceObserver subscribes to performance events as they happen
   * and respond to them asynchronously.
   * entry.name will be either 'first-paint' or 'first-contentful-paint'
   *
   * @param {any} cb
   */
  public firstContentfulPaint(cb: any): any {
    this.perfObserver = new PerformanceObserver(this.performanceObserverCb.bind(this, cb));
    this.perfObserver.observe({entryTypes: ["paint"]});
  }

  /**
   * Get the duration of the timing metric or -1 if there a measurement has
   * not been made by the User Timing API
   *
   * @param {string} metricName
   * @param {any} metrics
   */
  private getDurationByMetric(metricName: string, metrics: any) {
    const entry = this.getMeasurementForGivenName(metricName);
    if (entry && entry.entryType === "measure") {
      return entry.duration;
    }
    return -1;
  }

  /**
   * Return the last PerformanceEntry objects for the given name.
   *
   * @param {string} metricName
   */
  private getMeasurementForGivenName(metricName: string) {
    const entries = window.performance.getEntriesByName(metricName);
    return entries[entries.length - 1];
  }

  /**
   * @param {any} cb
   * @param {PerformanceObserverEntryList} entryList
   */
  private performanceObserverCb(cb: any, entryList: PerformanceObserverEntryList) {
    const entries = entryList.getEntries();
    cb(entries);
    entries.forEach((performancePaintTiming: any) => {
      if (this.config.firstContentfulPaint
          && performancePaintTiming.name === "first-contentful-paint") {
        this.perfObserver.disconnect();
      }
    });
  }

  /**
   * The polyfill exposes a getFirstConsistentlyInteractive() method,
   * which returns a promise that resolves with the TTI value.
   *
   * The getFirstConsistentlyInteractive() method accepts an optional
   * startTime configuration option, allowing you to specify a lower bound
   * for which you know your app cannot be interactive before.
   * By default the polyfill uses DOMContentLoaded as the start time,
   * but it's often more accurate to use something like the moment your hero elements
   * are visible or the point when you know all your event listeners have been added.
   *
   * @param {number} minValue
   * @param {any} cb
   */
  private timeToInteractive(minValue: number, cb: any) {
    this.ttiPolyfill.getFirstConsistentlyInteractive({ minValue }).then(cb);
  }
}
