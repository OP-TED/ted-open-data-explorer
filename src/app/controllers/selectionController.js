import { defineStore } from "pinia";
import getNoticeByPublicationNumber from "../../queries/getNoticeByPublicationNumber.js";
import getNamed from "../../queries/getNamed.js";

import { ref } from "vue";

export const useSelectionController = defineStore("notice", () => {
  const query = ref("");
  const history = ref([]);

  const addToHistory = (label, queryStr) => {
    // Check if query already exists in history
    const exists = history.value.some((item) => item.queryStr === queryStr);
    if (!exists) {
      history.value.push({ label, queryStr });
    }
  };

  const selectNoticeByPublicationNumber = (publicationNumber) => {
    const queryStr = getNoticeByPublicationNumber(publicationNumber);
    addToHistory(`Notice ${publicationNumber}`, queryStr);
    query.value = queryStr;
  };

  const selectNamed = (term, termLabel) => {
    const namedQuery = getNamed(term);
    const label = termLabel.prefix?`${termLabel.prefix}:${termLabel.display}`:termLabel.display

    addToHistory(label, namedQuery);
    query.value = namedQuery;
  };

  const removeHistoryItem = (index) => {
    history.value.splice(index, 1);
  };

  return {
    history,
    query,
    selectNoticeByPublicationNumber,
    selectNamed,
    removeHistoryItem,
  };
});
