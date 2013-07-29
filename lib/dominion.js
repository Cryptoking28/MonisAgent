'use strict';

// domains added on node 0.7+, no biggie if they're not available
var domain;
try { domain = require('domain'); } catch (error) {}

module.exports = {
  available : domain ? true : false,

  /**
   * Annotate a shared state variable with a domain. SYNCHRONOUS, so throw
   * immediately if the agent's missing -- it's a Monis Agent developer error if
   * the agent is missing.
   *
   * @param Agent agent The agent holding onto the error tracer.
   * @param State state The shared state for this stage of the
   *                    transaction.
   */
  add : function (agent, state) {
    if (!(state && domain)) return;
    if (!agent) {
      throw new Error("The Agent is where the error handler lives; required.");
    }

    var catcher = domain.create();

    function errored(error) {
      var transaction = state.getTransaction();
      agent.errors.add(transaction, error);

      /* FIXME: ending the transaction is semantically correct, but this opens
       * the possibility of sending incomplete / invalid transaction traces
       * back to NR. Is this bad?
       */
      transaction.end();

      /* To preserve crash semantics, ensure that the Monis Agent domain is
       * no longer active before rethrowing, which will grant other
       * uncaughtException handlers an opportunity to fire and / or causing
       * node to puke and die just like always.
       */
      catcher.exit();
      if (!process.emit('uncaughtException', error)) throw error;
    }
    catcher.once('error', errored);

    state.domain = catcher;
    // FIXME: consumers must use the bound handler off state
    // TODO: rework to remove side effect dependency
    if (state.call) state.call = catcher.bind(state.call);
    if (state.getTransaction() && state.getTransaction().trace) {
      state.getTransaction().trace.domain = catcher;
    }
  }
};
