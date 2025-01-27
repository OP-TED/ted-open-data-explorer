import { defineStore } from "pinia";
import getNoticeByPublicationNumber from "../../queries/getNoticeByPublicationNumber.js";
import { ref } from "vue";

export const useSelectionController = defineStore("notice", () => {
  const query = ref("");

  const selectNoticeByPublicationNumber = (publicationNumber) => {
    query.value = getNoticeByPublicationNumber(publicationNumber);
  };

  return {
    query,
    selectNoticeByPublicationNumber,
  };
});
