var Tooltip = new Rav({
  alias: 'tooltip',
  inputs: ['text'],
  state: function() {
    return { isVisible: false };
  },
  methods: {
    show: function() {
      this.setState({ isVisible: true });
    },
    hide: function() {
      this.setState({ isVisible: false });
    },
  },
  template: function() {
    return [
      'div',
      {
        onMouseEnter: 'show',
        onMouseLeave: 'hide',
        className: ['tooltip', {
          'isVisible': 'state.isVisible'
        }]
      },
      [
        'div',
        { className: ['tooltip__content'] },
        'inputs.text'
      ],
      'children'
    ];
  }
});
