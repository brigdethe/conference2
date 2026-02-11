
  $(document).ready(function() {
    $('#calendlyNav, #calendlyFooter').click(function() {
      Calendly.initPopupWidget({ url: 'https://calendly.com/snowhousestudio/15-min-chat-with-thorir-runarsson-snowhouse-studio' });
      return false;
    });
  });
